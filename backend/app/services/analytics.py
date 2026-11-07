from decimal import Decimal, ROUND_HALF_UP

def money(value): return float(Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) if value is not None else None
def ratio(a,b): return round(a/b*100,2) if a is not None and b else None

def menu_analysis(s):
    ingredients={i['id']:i for i in s['ingredients']}
    rows=[]
    for dish in s['menu']:
        missing=[ingredients.get(r['ingredient_id'],{}).get('name','Deleted ingredient') for r in dish['recipe'] if ingredients.get(r['ingredient_id'],{}).get('unit_cost') is None]
        cost=sum(Decimal(str(r['quantity_required']))*Decimal(str(ingredients[r['ingredient_id']]['unit_cost'])) for r in dish['recipe']) if dish['recipe'] and not missing else None
        price=dish['selling_price']; volume=dish['weekly_sales_volume']
        contribution=Decimal(str(price))-cost if cost is not None else None
        revenue=money(Decimal(str(price))*Decimal(str(volume))) if volume is not None else None
        weekly_cost=money(cost*Decimal(str(volume))) if cost is not None and volume is not None else None
        rows.append({**dish,'ingredient_cost':money(cost),'contribution_per_dish':money(contribution),'food_cost_percentage':ratio(float(cost) if cost is not None else None,price),'weekly_revenue':revenue,'weekly_ingredient_cost':weekly_cost,'weekly_contribution':money(Decimal(str(revenue))-Decimal(str(weekly_cost))) if revenue is not None and weekly_cost is not None else None,'missing_costs':missing,'classification':'Incomplete data'})
    active=[d for d in rows if d['is_active']]
    known=[d for d in active if d['contribution_per_dish'] is not None and d['weekly_sales_volume'] is not None]
    avg_pop=sum(d['weekly_sales_volume'] for d in known)/len(known) if known else 0
    avg_margin=sum(d['contribution_per_dish'] for d in known)/len(known) if known else 0
    for d in known:
        d['classification']=('Star' if d['contribution_per_dish']>=avg_margin else 'Workhorse') if d['weekly_sales_volume']>=avg_pop else ('Opportunity' if d['contribution_per_dish']>=avg_margin else 'Review')
    return {'dishes':rows,'baseline':{'average_weekly_sales':money(avg_pop),'average_contribution_per_dish':money(avg_margin)},'method':'Active dishes with known costs and sales; popularity and contribution per serving compared with their unweighted restaurant averages.'}

def overview(s):
    rows=[r for r in menu_analysis(s)['dishes'] if r['is_active']]
    def total(k): return money(sum(r[k] for r in rows)) if all(r[k] is not None for r in rows) else None
    revenue=total('weekly_revenue'); food=total('weekly_ingredient_cost'); contribution=total('weekly_contribution')
    labor=money(sum(e['hourly_wage']*e['weekly_hours'] for e in s['employees']))
    fixed=s['restaurant']['weekly_fixed_costs']
    warnings=[]
    if food is None: warnings.append('Complete recipe quantities and ingredient costs to calculate food costs.')
    if revenue is None: warnings.append('Some active dishes have no weekly sales estimate.')
    if fixed is None: warnings.append('Fixed operating costs are not recorded.')
    if not rows: warnings.append('No active menu items are recorded.')
    return {'revenue':revenue,'food_cost':food,'contribution':contribution,'labor_cost':labor,'fixed_cost':fixed,'operating_result':money(contribution-labor-fixed) if contribution is not None and fixed is not None else None,'labor_percentage':ratio(labor,revenue),'food_percentage':ratio(food,revenue),'contribution_margin':ratio(contribution,revenue),'warnings':warnings,'active_dishes':len(rows),'employee_count':len(s['employees'])}
