import {test} from 'node:test'
import assert from 'node:assert/strict'
import {balanceChipState,headChipsShown,isQuotaError,lowBalanceDue,balanceDay} from '../lib/client/balance-chip.js'
import {walletView,HOST_FRESH_MS} from '../lib/client/wallet.js'
import {readPreferences,PREFERENCES_KEY} from '../lib/client/preferences.js'

const ready=(amount:string)=>({status:'ready' as const,wallets:[{currency:'CNY',amount}]})
const host=(status:any,updatedAt:number|null,amount='12.5')=>({status,source:'host' as const,toppedUp:updatedAt===null?{status:'unknown' as const}:ready(amount),granted:updatedAt===null?{status:'unknown' as const}:ready('1'),updatedAt})
const view=(h:any,now=1_000_000,extra:any={})=>walletView({host:h,known:false,toppedUp:'',granted:'',checkedAt:null,now,ricePrice:1,...extra})

test('Balance chip: five states, and digits only when something was read',()=>{
  assert.equal(balanceChipState(view(host('loading',null))),'loading')
  assert.equal(balanceChipState(view(host('signed-out',null))),'signed-out')
  assert.equal(balanceChipState(view(host('error',null))),'failed')
  assert.equal(balanceChipState(view(null)),'failed','no host and nothing read: — with a way out, not an empty frame')
  const live=view(host('ready',1_000_000));assert.equal(balanceChipState(live),'ok');assert.equal(live.toppedUp,'¥12.50')
  assert.equal(balanceChipState(view(host('ready',1_000_000),1_000_000+HOST_FRESH_MS+1)),'stale','older than ten minutes')
  assert.equal(HOST_FRESH_MS,600_000)
  assert.equal(balanceChipState(view(host('stale',1_000_000))),'stale','a failed refresh keeps the last amounts, greyed')
  assert.equal(balanceChipState({status:'live',toppedUp:null,granted:null}),'failed','never digits without a read')
})

test('Balance chip: the user chooses what shows above her head',()=>{
  assert.deepEqual(headChipsShown('both'),{tier:true,balance:true});assert.deepEqual(headChipsShown('tier'),{tier:true,balance:false})
  assert.deepEqual(headChipsShown('balance'),{tier:false,balance:true});assert.deepEqual(headChipsShown('none'),{tier:false,balance:false})
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let value='{}'
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===PREFERENCES_KEY?value:null,setItem(){}}})
  try{
    assert.equal(readPreferences().headChips,'both');assert.equal(readPreferences().lowBalanceAt,2)
    value='{"headChips":"tier","lowBalanceAt":20}';assert.equal(readPreferences().headChips,'tier');assert.equal(readPreferences().lowBalanceAt,20)
    value='{"headChips":"all","lowBalanceAt":-5}';assert.equal(readPreferences().headChips,'both');assert.equal(readPreferences().lowBalanceAt,0)
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete (globalThis as any).localStorage}
})

test('Balance reminders: the threshold is the user’s, once per local day; quota errors are recognised',()=>{
  const fresh=host('ready',1_000_000,'12.5')
  assert.equal(view(fresh).low,false);assert.equal(view(fresh,1_000_000,{lowAt:20}).low,true);assert.equal(view(host('ready',1_000_000,'0.5'),1_000_000,{lowAt:0}).low,false,'0 turns it off')
  const noon=new Date(2026,10,12,12).getTime(),night=new Date(2026,10,12,23,59).getTime(),next=new Date(2026,10,13,0,1).getTime()
  assert.equal(balanceDay(noon),'2026-11-12')
  assert.equal(lowBalanceDue(true,null,noon),true);assert.equal(lowBalanceDue(true,balanceDay(noon),night),false,'at most once a day')
  assert.equal(lowBalanceDue(true,balanceDay(noon),next),true);assert.equal(lowBalanceDue(false,null,noon),false)
  for(const code of ['ACCOUNT_QUOTA','QUOTA','insufficient_quota','INSUFFICIENT_BALANCE'])assert.ok(isQuotaError(code),code)
  for(const text of ['余额充足，放心用','The quota resets monthly','今天的回答写好了','如果接口提示 insufficient_balance，请先检查充值状态。','Example: ACCOUNT_QUOTA','请求失败：余额不足'])assert.ok(!isQuotaError(text),text)
})
