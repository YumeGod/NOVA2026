from app.services.analytics import menu_analysis
from app.services.staffing import can_prepare

def preview_dish(s,dish):
    d={'id':-1,**dish}
    result=menu_analysis({**s,'menu':[d]})['dishes'][0]
    result['capable_employees']=[e['name'] for e in s['employees'] if can_prepare(e,d)]
    ingredients={i['id']:i for i in s['ingredients']}
    result['recipe_details']=[{'name':ingredients.get(r['ingredient_id'],{}).get('name','Unknown ingredient'),'unit':ingredients.get(r['ingredient_id'],{}).get('unit','unknown'),**r} for r in d['recipe']]
    result['missing_ingredients']=[r['ingredient_id'] for r in d['recipe'] if r['ingredient_id'] not in ingredients]
    unknown=not d['recipe'] or any(ingredients.get(r['ingredient_id'],{}).get('inventory_quantity') is None for r in d['recipe'])
    sufficient=all(ingredients.get(r['ingredient_id'],{}).get('inventory_quantity',0) is not None and ingredients.get(r['ingredient_id'],{}).get('inventory_quantity',0)>=r['quantity_required'] for r in d['recipe'])
    result['inventory_status']='unknown' if unknown else 'supported' if sufficient else 'insufficient'
    result['inventory_supports_one_serving']=not unknown and sufficient
    result['missing_skills']=[sk['name'] for sk in d['skills'] if not any(e['weekly_hours']>0 and any(es['name']==sk['name'] and es['proficiency']>=sk['proficiency'] for es in e['skills']) for e in s['employees'])]
    result['feasibility']='Requires ingredients' if result['missing_ingredients'] else 'Requires skills or training' if not result['capable_employees'] else 'Supported by recorded ingredients and skills'
    result['assumptions']=['Recipe quantities and selling price are suggestions; validate with a kitchen trial.','Weekly sales are an explicit hypothetical assumption, not a forecast.','Inventory support is for one serving, not the full weekly sales assumption.']
    return result
