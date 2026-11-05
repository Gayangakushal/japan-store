import { describe, expect, it } from 'vitest';
import { defaultSupabaseProject, resolvePublicSupabaseConfig } from '@/integrations/supabase/public-config';

describe('Public Supabase deployment configuration', () => {
  it('uses the selected public project when hosting variables are missing', () => {
    expect(resolvePublicSupabaseConfig()).toEqual(defaultSupabaseProject);
    expect(resolvePublicSupabaseConfig({ url: '', publishableKey: '' })).toEqual(defaultSupabaseProject);
  });
  it('supports a complete hosting override without mixing different projects', () => {
    expect(resolvePublicSupabaseConfig({ url: 'https://override.supabase.co/', publishableKey: 'sb_publishable_override' })).toEqual({ url: 'https://override.supabase.co', publishableKey: 'sb_publishable_override' });
  });
  it('reports partial configuration instead of combining a URL with another project key', () => {
    expect(() => resolvePublicSupabaseConfig({ url: 'https://override.supabase.co' })).toThrow('Set both');
    expect(() => resolvePublicSupabaseConfig({ publishableKey: 'sb_publishable_override' })).toThrow('Set both');
  });
  it('rejects secret keys and invalid URL schemes in browser configuration', () => {
    expect(() => resolvePublicSupabaseConfig({ url: defaultSupabaseProject.url, publishableKey: 'sb_secret_not_for_browsers' })).toThrow('publishable key');
    expect(() => resolvePublicSupabaseConfig({ url: 'javascript:alert(1)', publishableKey: 'sb_publishable_override' })).toThrow('HTTP');
  });
});
