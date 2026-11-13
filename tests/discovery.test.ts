import {test} from 'node:test'
import assert from 'node:assert/strict'
import {INTERACTIONS,GUIDE_STEPS,DISCOVERIES_KEY,readDiscoveries,saveDiscoveries,discover,discoveryCount,discoveryDate,guideStep} from '../lib/client/discovery.js'

test('Discoveries: the first time is kept, the gallery survives a reload and ignores junk',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let value:string|null=null
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===DISCOVERIES_KEY?value:null,setItem:(key:string,data:string)=>{assert.equal(key,DISCOVERIES_KEY);value=data}}})
  try{
    assert.deepEqual(readDiscoveries(),{})
    const first=discover({},'pat',1000);assert.equal(first.pat,1000)
    assert.equal(discover(first,'pat',2000),first,'already known: nothing changes, nothing to save')
    const two=discover(first,'tail',3000);saveDiscoveries(two)
    assert.deepEqual(readDiscoveries(),{pat:1000,tail:3000});assert.equal(discoveryCount(readDiscoveries()),2)
    value='{"pat":"yesterday","fly":5,"peek":-1,"carry":7}';assert.deepEqual(readDiscoveries(),{carry:7})
    value='nonsense';assert.deepEqual(readDiscoveries(),{})
    value='{"pat":1e100,"tail":8640000000000001,"carry":1000}';assert.deepEqual(readDiscoveries(),{carry:1000})
    for(const bad of [NaN, Infinity, -1, 0, 1e100, 8640000000000001, '1000']) assert.equal(discoveryDate(bad),null)
    assert.doesNotThrow(()=>discoveryDate(8640000000000000)?.toISOString())
    assert.equal(discoveryCount({pat:1e100,carry:1000}),1)
    assert.deepEqual(discover({},'pat',1e100),{})
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked')}})
    assert.deepEqual(readDiscoveries(),{});saveDiscoveries(two)
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete (globalThis as any).localStorage}
})

test('Guide: three steps in order, done in any order, and every gallery entry has a hint that does not give the name away',()=>{
  assert.deepEqual([...GUIDE_STEPS],['pat','carry','peek'])
  assert.equal(guideStep([]),0);assert.equal(guideStep(['pat']),1);assert.equal(guideStep(['carry']),0,'an early second step still waits for the first')
  assert.equal(guideStep(['carry','pat']),2);assert.equal(guideStep(['peek','pat','carry']),3)
  assert.ok(INTERACTIONS.length>=9);assert.equal(new Set(INTERACTIONS.map(i=>i.id)).size,INTERACTIONS.length)
  for(const id of GUIDE_STEPS)assert.ok(INTERACTIONS.some(i=>i.id===id))
  for(const item of INTERACTIONS){for(const pair of [item.name,item.hint,item.how]){assert.ok(pair[0]&&pair[1])}assert.ok(!item.hint[0].includes(item.name[0]),item.id)}
})
