"""Opt-in live provider check. Uses .env; never prints credentials or changes business records."""
import asyncio, json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app.services.seed import seed
from app.services.data import state
from app.services.ai_service import advise, AIUnavailable
async def main():
    engine=create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed(db); snapshot=state(db)
    cases=['How profitable is my restaurant right now?','Which dishes should I focus on?','What skills should my next chef have?','What happens if I remove one employee?','Suggest a new dish using my existing ingredients.']
    for question in cases:
        start=time.monotonic()
        try:
            result=await advise(snapshot,[{'role':'user','content':question}])
            print(json.dumps({'question':question,'seconds':round(time.monotonic()-start,1),'source':result.get('source'),'intent':result.get('intent'),'actions':len(result.get('actions',[])),'proposal':result.get('proposal',{}).get('kind') if result.get('proposal') else None,'message':result['message'][:700]}),flush=True)
        except AIUnavailable as error:
            print(json.dumps({'question':question,'error':str(error)}),flush=True)
            return 1
    return 0
if __name__=='__main__': sys.exit(asyncio.run(main()))
