import {test} from 'node:test'
import assert from 'node:assert/strict'
import {watchAccountBalances, ACCOUNT_REFRESH, type AccountBalanceStream} from '../lib/client/account-balance.js'
import {PetStateMachine} from '../lib/client/state-machine.js'

function streamQueue() {
  const queue: any[] = []; let next: ((value: any) => void) | null = null
  let disposed = false, accepted = 0
  const stream: AccountBalanceStream = {
    [Symbol.asyncIterator]() { return {next: () => queue.length ? Promise.resolve(queue.shift()) : disposed ? Promise.resolve({done:true, value:undefined}) : new Promise(resolve => {next=resolve})} },
    dispose() { disposed=true; next?.({done:true, value:undefined}); next=null },
  }
  return {stream, get disposed(){return disposed}, get accepted(){return accepted},
    push(status:string) {const item={done:false,value:{value:{status},accept(){accepted++}}}; if(next){const resolve=next;next=null;resolve(item)}else queue.push(item)},
  }
}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
const reply=(amount:string)=>({ok:true,value:{status:'ready',value:[{currency:'CNY',balance:amount}],bonusWallets:[]}})

test('Account changes clear host and DOM balances, cancel pending reads and never retain a previous account on failure', async()=>{
  const sm=new PetStateMachine(), queue=streamQueue()
  let calls=0, resolveOld:(v:unknown)=>void=()=>{}
  const binding=watchAccountBalances({getBalance:()=>{
    calls++
    return calls===1?Promise.resolve(reply('10')):calls===2?new Promise(resolve=>{resolveOld=resolve}):calls===3?Promise.resolve({ok:true,value:{status:'failed'}}):Promise.resolve(reply('9'))
  },publish:s=>{if(s===null)sm.clearBalances();else sm.setHostBalance(s)}},()=>queue.stream)
  try{
    queue.push('credential-stored');await flush()
    assert.equal(sm.getStatus().hostBalance?.toppedUp.status,'ready')
    sm.setBalances('¥10.00','¥1.00')
    void binding.refresh(true)
    queue.push('signed-out');await flush()
    assert.equal(sm.getStatus().hostBalance?.status,'signed-out')
    assert.equal(sm.getStatus().balancesKnown,false)
    assert.equal(sm.getStatus().toppedUpBalance,'')
    resolveOld(reply('999'));await flush()
    assert.equal(sm.getStatus().hostBalance?.status,'signed-out','late reply from A is ignored')
    queue.push('credential-stored');await flush()
    assert.equal(sm.getStatus().hostBalance?.status,'error')
    assert.equal(sm.getStatus().hostBalance?.toppedUp.status,'unknown','B failure cannot show A balance')
    await binding.refresh(true)
    assert.equal(sm.getStatus().hostBalance?.status,'ready')
    assert.equal(queue.accepted,3)
  }finally{binding.stop();sm.dispose()}
})

test('Even a credential-to-credential notification invalidates an old account snapshot',async()=>{
  const q=streamQueue(),published:any[]=[];let calls=0
  const binding=watchAccountBalances({getBalance:async()=>++calls===1?reply('10'):{ok:true,value:{status:'failed'}},publish:s=>published.push(s)},()=>q.stream)
  try{
    q.push('credential-stored');await flush()
    q.push('credential-stored');await flush()
    assert.equal(published.at(-1).status,'error')
    assert.equal(published.at(-1).toppedUp.status,'unknown')
  }finally{binding.stop()}
})

test('A silent account stream times out, reconnects, and leaves no timers or late publications on stop',async()=>{
  let now=0,id=0,calls=0;const timers=new Map<number,{at:number;fn:()=>void}>(),queues:ReturnType<typeof streamQueue>[]=[],published:any[]=[]
  const binding=watchAccountBalances({getBalance:async()=>{calls++;return reply('7')},publish:s=>published.push(s),now:()=>now,
    schedule:(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id},cancel:h=>{timers.delete(h as number)},
  },()=>{const q=streamQueue();queues.push(q);return q.stream})
  const advance=async(ms:number)=>{now+=ms;for(const[key,t]of [...timers])if(t.at<=now){timers.delete(key);t.fn();await flush()}}
  await advance(ACCOUNT_REFRESH.timeoutMs)
  assert.equal(published.at(-1).status,'error');assert.equal(queues[0].disposed,true);assert.equal(calls,0)
  await advance(ACCOUNT_REFRESH.failBaseMs)
  queues[1].push('credential-stored');await flush();assert.equal(published.at(-1).status,'ready')
  binding.stop();const count=published.length
  assert.equal(timers.size,0);assert.equal(queues[1].disposed,true)
  await flush();assert.equal(published.length,count)
})

test('Legacy hosts without an account stream discard previous amounts on failed refresh',async()=>{
  const published:any[]=[];let calls=0
  const binding=watchAccountBalances({getBalance:async()=>++calls===1?reply('10'):{ok:true,value:{status:'failed'}},publish:s=>published.push(s)})
  try{await flush();await binding.refresh(true);assert.equal(published.at(-1).status,'error');assert.equal(published.at(-1).toppedUp.status,'unknown')}
  finally{binding.stop()}
})
