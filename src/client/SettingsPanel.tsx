import React from 'react'
import type { Preferences } from './preferences.js'
export function SettingsPanel({ p, update, toggleMute, quiet, reset, doctor, notify }: { p: Preferences; update: (p: Partial<Preferences>) => void; toggleMute: () => void; quiet: () => void; reset: () => void; doctor: () => void; notify: () => void }) {
 const t = (zh: string, en: string) => p.language === 'en' ? en : zh
 const sizes = [0.5, .75, 1, 1.15, 1.3]
 const selected = sizes.reduce((best, v) => Math.abs(v-p.scale)<Math.abs(best-p.scale)?v:best)
 return <>
 <details className="petSettingsGroup" open><summary>{t('外观','Appearance')}</summary><div className="petPreferenceGrid">
 <span>{t('主题','Theme')}</span><div className="petThemeSwitch">{(['light','dark'] as const).map(theme=><button key={theme} aria-pressed={p.theme===theme} aria-label={theme==='light'?t('浅色主题','Light theme'):t('深色主题','Dark theme')} className={p.theme===theme?'selected':''} onClick={()=>update({theme})}>{theme==='light'?t('☀ 浅色','☀ Light'):t('☾ 深色','☾ Dark')}</button>)}</div>
 <span>{t('界面语言','Interface language')}</span><div className="petThemeSwitch">{(['zh','en'] as const).map(language=><button key={language} aria-pressed={p.language===language} onClick={()=>update({language})}>{language==='zh'?'中文':'English'}</button>)}</div>
 <label id="pet-scale-label">{t('大小','Size')} · {['XS','S','M','L','XL'][sizes.indexOf(selected)]}</label><div className="petSizeSlider"><input type="range" min="0" max="4" step="1" value={sizes.indexOf(selected)} aria-labelledby="pet-scale-label" aria-valuetext={Math.round(selected*100)+'%'} onChange={e=>update({scale:sizes[Number(e.target.value)]})}/><div className="petSizeDots">{sizes.map((v,i)=><button key={v} className={i===2?'default':''} type="button" title={['XS','S','M','L','XL'][i]} aria-label={t('大小 ','Size ')+['XS','S','M','L','XL'][i]} aria-pressed={v===selected} onClick={()=>update({scale:v})}><i/></button>)}</div></div>
 <label htmlFor="pet-opacity">{t('透明度','Opacity')} · {Math.round(p.opacity*100)}%</label><input id="pet-opacity" type="range" min="0.35" max="1" step="0.05" value={p.opacity} onChange={e=>update({opacity:Number(e.target.value)})}/>
 <label htmlFor="pet-font">{t('文字大小','Text size')} · <output htmlFor="pet-font">{p.fontSize}px</output></label><input id="pet-font" type="range" min="14" max="24" step="0.1" value={p.fontSize} aria-valuetext={p.fontSize+'px'} onChange={e=>update({fontSize:Number(e.target.value)})}/>
 <label><input type="checkbox" checked={p.docked} onChange={e=>update({docked:e.target.checked})}/>{t('贴边探头（只露出上半身）','Peek from the edge')}</label>
 </div></details>
 <details className="petSettingsGroup"><summary>{t('声音','Sound')}</summary><div className="petPreferenceGrid">
 <label><input type="checkbox" checked={!p.muted} disabled={p.quiet} onChange={toggleMute}/> {t('人物音效','Character sounds')}</label>
 <label htmlFor="pet-volume">{t('音量','Volume')} · {Math.round(p.volume*100)}%</label><input id="pet-volume" type="range" min="0" max="1" step="0.05" value={p.volume} disabled={p.muted||p.quiet} onChange={e=>update({volume:Number(e.target.value)})}/>
 </div></details>
 <details className="petSettingsGroup"><summary>{t('陪伴行为','Companionship')}</summary><div className="petPreferenceGrid">
 <button className="petWide" aria-pressed={p.quiet} onClick={quiet}>{p.quiet?t('结束安静模式（恢复之前设置）','End quiet mode (restore previous settings)'):t('安静模式：关闭闲聊、音效和游荡','Quiet mode: pause chatter, sounds & wandering')}</button>
 <label><input type="checkbox" checked={p.wandering} disabled={p.quiet} onChange={e=>update({wandering:e.target.checked})}/>{t('闲置时散步','Wander when idle')}</label>
 <label><input type="checkbox" checked={p.reminders} onChange={e=>update({reminders:e.target.checked})}/>{t('午饭和熬夜提醒','Lunch & late-night reminders')}</label>
 <label htmlFor="pet-user">{t('怎么称呼你','Your name')}</label><input id="pet-user" value={p.userName} maxLength={24} onChange={e=>update({userName:e.target.value})}/>
 <label htmlFor="pet-name">{t('她的昵称','Her nickname')}</label><input id="pet-name" value={p.petName} maxLength={24} onChange={e=>update({petName:e.target.value})}/>
 <label htmlFor="pet-rice">{t('每碗饭额度','Credit per bowl')}</label><input id="pet-rice" type="number" min="0.01" max="100" step="0.1" value={p.ricePrice} onChange={e=>{const n=Number(e.target.value);if(n>=.01&&n<=100)update({ricePrice:n})}}/>
 </div></details>
 <details className="petSettingsGroup"><summary>{t('剧场阅读','Theatre reading')}</summary><div className="petPreferenceGrid">
 <label><input type="checkbox" checked={p.typewriter} onChange={e=>update({typewriter:e.target.checked})}/>{t('逐字显示短篇叙述','Reveal short narrative text gradually')}</label>
 <label htmlFor="pet-speed">{t('文字速度','Text speed')}</label><div id="pet-speed" className="petSegments" role="group" aria-label={t('文字速度','Text speed')}>{(['slow','medium','fast','instant'] as const).map((v,i)=><button key={v} aria-pressed={p.speed===v} onClick={()=>update({speed:v})}>{t(['慢','中','快','瞬间'][i],['Slow','Mid','Fast','Now'][i])}</button>)}</div>
 <label><input type="checkbox" checked={p.autoAdvance} onChange={e=>update({autoAdvance:e.target.checked})}/>{t('读完后自动显示下一段','Show the next page automatically')}</label>
 <label><input type="checkbox" checked={p.autoGalGame} onChange={e=>update({autoGalGame:e.target.checked})}/>{t('点击输入框进入剧场','Enter theatre on composer click')}</label>
 </div></details>
 <details className="petSettingsGroup"><summary>{t('高级','Advanced')}</summary><div className="petPreferenceGrid">
 <button className="petWide" onClick={notify}>{p.notifications?t('关闭完成通知','Disable completion notifications'):t('开启后台完成通知（需系统授权）','Enable background completion notifications (permission required)')}</button>
 <button className="petWide" onClick={doctor}>{t('兼容性检查 Doctor','Compatibility Doctor')}</button>
 <button className="petWide" onClick={reset}>{t('恢复默认设置','Restore defaults')}</button>
 </div></details>
 <p className="petUnofficial">{t('非官方社区插件','Unofficial community plugin')}</p>
 </>
}
