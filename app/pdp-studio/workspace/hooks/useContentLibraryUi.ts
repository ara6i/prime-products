"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDesign, createFromTemplate, createTemplate, deleteDesign, deleteTemplate, listDesigns, listTemplates } from "../../editor/services/pdpStudioDesignService";
import { emptyDesignDocument, type PdpDesign, type PdpTemplate } from "../../editor/types/pdpStudioDesign";
export function useContentLibraryUi(kind:"design"|"template") { const router=useRouter(); const [dialog,setDialog]=useState<"item"|null>(null); const [name,setName]=useState(""); const [items,setItems]=useState<Array<PdpDesign|PdpTemplate>>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{setItems(kind==="design"?(await listDesigns()).designs:await listTemplates())}catch(reason){setError(reason instanceof Error?reason.message:"Unable to load the library.")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[kind]);
 const createItem=async()=>{const value=name.trim();if(!value)return;try{if(kind==="design"){const design=await createDesign({name:value,width:1200,height:1200});router.push(`/pdp-studio/designs/${design.id}`)}else{await createTemplate({name:value,description:"Reusable PDP Studio layout",document:emptyDesignDocument()});setDialog(null);setName("");await load()}}catch(reason){setError(reason instanceof Error?reason.message:"Unable to create this item.")}};
 const open=async(item:PdpDesign|PdpTemplate)=>{if(kind==="design")router.push(`/pdp-studio/designs/${item.id}`);else{const design=await createFromTemplate(item.id);router.push(`/pdp-studio/designs/${design.id}`)}};
 const remove=async(item:PdpDesign|PdpTemplate)=>{if(kind==="design")await deleteDesign(item.id);else await deleteTemplate(item.id);await load()};
 return{dialog,name,items,loading,error,setDialog,setName,createItem,open,remove}; }
