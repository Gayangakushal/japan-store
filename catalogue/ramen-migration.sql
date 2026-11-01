-- Executed only through an approved, transactional migration runner.
-- No LKR prices, cart data, roles, policies, grants or existing product names are changed.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ramen jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS products_ramen_slug ON public.products ((ramen->>'slug')) WHERE ramen IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_ramen_catalogue_id ON public.products ((ramen->>'catalogue_id')) WHERE ramen IS NOT NULL;
DO $schema$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.products'::regclass AND conname='products_ramen_valid_v2') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_ramen_valid_v2 CHECK (
      ramen IS NULL OR COALESCE(
        jsonb_typeof(ramen)='object'
        AND ramen ?& ARRAY['catalogue_id','slug','name','brand','country','flavor','category','price_jpy','spicy_level','availability','unit','image']
        AND length(ramen->>'catalogue_id')>0 AND length(ramen->>'slug')>0
        AND length(ramen->>'name')>0 AND length(ramen->>'brand')>0
        AND length(ramen->>'country')>0 AND length(ramen->>'flavor')>0
        AND ramen->>'category'='Ramen'
        AND jsonb_typeof(ramen->'price_jpy')='number' AND (ramen->>'price_jpy')::numeric>0
        AND jsonb_typeof(ramen->'spicy_level')='number' AND (ramen->>'spicy_level')::numeric BETWEEN 0 AND 5
        AND (ramen->>'spicy_level')::numeric=trunc((ramen->>'spicy_level')::numeric)
        AND ramen->>'availability' IN ('unconfirmed','in_stock','out_of_stock')
        AND length(ramen->>'unit')>0 AND length(ramen->>'image')>0, false)
    );
  END IF;
END $schema$;
DO $seed$
DECLARE
  catalogue jsonb := $catalogue$__CATALOGUE_JSON__$catalogue$::jsonb;
  item jsonb;
  target public.products%ROWTYPE;
  updated jsonb;
BEGIN
  -- Serialize seed runs. Public/admin writers continue to use the existing RLS policies.
  LOCK TABLE public.products IN SHARE ROW EXCLUSIVE MODE;
  FOR item IN SELECT value FROM jsonb_array_elements(catalogue) LOOP
    SELECT * INTO target FROM public.products
      WHERE ramen->>'catalogue_id'=item->>'catalogue_id' OR ramen->>'slug'=item->>'slug'
        OR (ramen IS NULL AND category='Ramen' AND lower(btrim(name))=lower(item->>'name'))
      ORDER BY CASE WHEN ramen->>'catalogue_id'=item->>'catalogue_id' THEN 0 WHEN ramen->>'slug'=item->>'slug' THEN 1 ELSE 2 END, id LIMIT 1;
    IF FOUND THEN
      IF target.ramen IS NOT NULL AND target.ramen->>'catalogue_id' IS DISTINCT FROM item->>'catalogue_id' THEN
        RAISE EXCEPTION 'Catalogue identity conflict: %', item->>'slug';
      END IF;
      updated := COALESCE(target.ramen,item);
      -- Repair only the known managed images, leaving an administrator's custom image intact.
      IF target.ramen IS NULL OR target.ramen->>'image' IN ('/products/ramen/'||(item->>'slug')||'.svg',item->>'image') OR target.ramen->>'image' LIKE '%images.unsplash.com%' THEN
        updated := updated || jsonb_build_object('image',item->>'image','image_alt',item->>'image_alt','image_status',item->>'image_status','image_credit',item->'image_credit');
      END IF;
      IF target.ramen->>'unit' LIKE '%pending SKU confirmation%' THEN
        updated := updated || jsonb_build_object('unit',item->>'unit');
      END IF;
      UPDATE public.products SET ramen=updated,
        image=CASE WHEN image LIKE '%images.unsplash.com/photo-1569718212165-3a8278d5f624%' OR image IN ('/products/ramen/'||(item->>'slug')||'.svg',item->>'image') THEN item->>'image' ELSE image END
        WHERE id=target.id;
    ELSE
      INSERT INTO public.products(name,category,subtitle,price,size,image,tag,ramen)
      VALUES(item->>'name','Ramen',item->>'description',0,item->>'unit',item->>'image','CATALOGUE',item);
    END IF;
  END LOOP;
  -- Check the 50 expected identities, not the number of unrelated/custom ramen entries.
  IF (SELECT count(*) FROM jsonb_array_elements(catalogue) expected
      WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.ramen->>'catalogue_id'=expected->>'catalogue_id')) <> 50 THEN
    RAISE EXCEPTION 'Expected all 50 requested ramen catalogue identities';
  END IF;
END $seed$;
