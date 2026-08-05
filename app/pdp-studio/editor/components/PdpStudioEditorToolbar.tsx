"use client";
import { ArrowLeft, Circle, Download, ImagePlus, MessageCircle, MousePointer2, Pencil, Redo2, Save, Square, Type, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
interface Props { status: string; tool: string; canUndo: boolean; canRedo: boolean; downloadUrl: string; onTool(tool: "select"|"draw"|"comment"): void; onText(): void; onShape(shape:"rectangle"|"ellipse"): void; onInsert(file:File):void; onUndo():void; onRedo():void; onSave():void; }
export function PdpStudioEditorToolbar(props: Props) { const fileRef=useRef<HTMLInputElement>(null); return <header className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[#dfe3ea] bg-white p-2 shadow-sm">
  <Link href="/pdp-studio/designs" className="grid size-10 place-items-center rounded-xl text-[#475569] hover:bg-[#f3f4f6]" aria-label="Back to designs"><ArrowLeft size={18}/></Link><div className="h-6 w-px bg-[#e5e7eb]"/>
  <Tool active={props.tool==="select"} label="Select" icon={<MousePointer2 size={17}/>} onClick={()=>props.onTool("select")}/>
  <button className="editor-tool" onClick={()=>fileRef.current?.click()}><ImagePlus size={17}/>Insert</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const file=e.target.files?.[0]; if(file) props.onInsert(file); e.currentTarget.value=""}}/>
  <button className="editor-tool" onClick={props.onText}><Type size={17}/>Text</button><button className="editor-tool" onClick={()=>props.onShape("rectangle")}><Square size={17}/>Shape</button><button className="editor-tool" onClick={()=>props.onShape("ellipse")}><Circle size={17}/>Ellipse</button>
  <Tool active={props.tool==="draw"} label="Draw" icon={<Pencil size={17}/>} onClick={()=>props.onTool("draw")}/>
  <Tool active={props.tool==="comment"} label="Comment" icon={<MessageCircle size={17}/>} onClick={()=>props.onTool("comment")}/><div className="h-6 w-px bg-[#e5e7eb]"/>
  <button className="editor-icon" disabled={!props.canUndo} onClick={props.onUndo} aria-label="Undo"><Undo2 size={17}/></button><button className="editor-icon" disabled={!props.canRedo} onClick={props.onRedo} aria-label="Redo"><Redo2 size={17}/></button>
  <div className="ml-auto flex items-center gap-2"><span className={`px-2 text-xs ${props.status==="error"||props.status==="conflict"?"text-red-600":"text-[#64748b]"}`}>{props.status==="saving"?"Saving…":props.status==="saved"?"Saved":props.status==="conflict"?"Save conflict":props.status}</span><button className="editor-tool" onClick={props.onSave}><Save size={17}/>Save</button><a className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#315EF5] px-4 text-sm font-medium text-white hover:bg-[#244bd5]" href={props.downloadUrl}><Download size={17}/>Download</a></div>
</header>; }
function Tool({active,label,icon,onClick}:{active:boolean;label:string;icon:React.ReactNode;onClick():void}){return <button className={`editor-tool ${active?"bg-[#eef3ff] text-[#315EF5]":""}`} onClick={onClick}>{icon}{label}</button>}
