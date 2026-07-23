/** Defect category labels for construction-v2 plan pins (v1). */
export type DefectCategoryV2 = 'critical' | 'major' | 'minor';

/** Defect lifecycle status (v1: create as open). */
export type DefectStatusV2 = 'open' | 'closed' | 'cancelled';

/**
 * ConstructionDefectV2 — поля ≈ таблица construction_defects_v2 (sql/002).
 * Координаты x/y — проценты 0…100 относительно страницы плана.
 */
export interface ConstructionDefectV2 {
  id: string;
  companyId: string;
  locationId: string;
  x: number;
  y: number;
  template_key?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  norm_text?: string | null;
  text?: string | null;
  category: DefectCategoryV2 | string;
  deadline?: string | null;
  contractorId?: string | null;
  description: string;
  photo?: string | null;
  status: DefectStatusV2 | string;
  history?: unknown;
  created_by?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;
  syncStatus?: string;
  source?: string;
  _deleted?: boolean;
}

export const DEFECT_CATEGORIES_V2: DefectCategoryV2[] = ['critical', 'major', 'minor'];
