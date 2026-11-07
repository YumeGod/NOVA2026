export type Skill = { name: string; proficiency: number };
export type Employee = {
  id: number;
  name: string;
  role: string;
  hourly_wage: number;
  weekly_hours: number;
  skills: Skill[];
  dish_ids: number[];
  availability: string;
};
export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  unit_cost: number | null;
  inventory_quantity: number | null;
  reorder_threshold: number | null;
};
export type Dish = {
  id: number;
  name: string;
  category: string;
  selling_price: number;
  weekly_sales_volume: number | null;
  prep_time_minutes: number | null;
  is_active: boolean;
  skills: Skill[];
  recipe: { ingredient_id: number; quantity_required: number }[];
  ingredient_cost?: number | null;
  weekly_contribution?: number | null;
  contribution_per_dish?: number | null;
  food_cost_percentage?: number | null;
  classification?: string;
};
export type State = {
  restaurant: {
    name: string;
    cuisine_type: string;
    description: string;
    operating_days: number;
    weekly_fixed_costs: number | null;
    goals: string;
  };
  employees: Employee[];
  ingredients: Ingredient[];
  menu: Dish[];
};
export type Metrics = {
  revenue: number | null;
  food_cost: number | null;
  labor_cost: number;
  fixed_cost: number | null;
  operating_result: number | null;
  contribution: number | null;
  food_percentage: number | null;
  labor_percentage: number | null;
  contribution_margin: number | null;
  warnings: string[];
  active_dishes: number;
  employee_count: number;
};
export type Scenario = {
  type: string;
  employee_id?: number;
  dish_ids?: number[];
  hours?: number;
  price?: number;
  employee?: Omit<Employee, "id">;
  dish?: Omit<Dish, "id">;
};
export type Simulation = {
  ingredient_usage_changes?: {
    id: number;
    name: string;
    unit: string;
    before: number | null;
    after: number | null;
  }[];
  gained_dishes?: string[];
  id?: number;
  type: string;
  before: Metrics;
  after: Metrics;
  delta: Record<string, number | null>;
  lost_dishes: string[];
  risks: string[];
  assumptions: string[];
  coverage_before: any;
  coverage_after: any;
};
export type Message = {
  id: number;
  role: string;
  content: string;
  payload: {
    source?: string;
    actions?: { label: string; detail?: string; scenario: Scenario }[];
    analysis?: { simulation?: Simulation; dish_preview?: any; staffing?: any };
    proposal?: { id: number; kind: string; data: any };
    assumptions?: string[];
  };
};
