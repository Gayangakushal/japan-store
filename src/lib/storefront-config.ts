export type CategoryStatus = Record<string, "active" | "coming_soon">;
export const defaultCategoryStatus: CategoryStatus = {
  Ramen: "active",
  Beauty: "coming_soon",
  Chocolate: "coming_soon",
};
