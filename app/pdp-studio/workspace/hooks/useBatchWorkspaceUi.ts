"use client";
import { useEffect, useRef, useState } from "react";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import { cancelPdpStudioBatch, createPdpStudioBatch, getPdpStudioBatch, listPdpStudioBatches, retryFailedPdpStudioBatch } from "../../platform/services/pdpStudioBatchService";
import type { PdpStudioBatch } from "../../platform/types/pdpStudioPlatform";
import { mapPdpStudioBatchPreset } from "../mappers/pdpStudioBatchPresetMapper";
import type { PdpStudioLocalFile } from "../types";
export function useBatchWorkspaceUi() { const [files,setFiles]=useState<PdpStudioLocalFile[]>([]), [selectedBackground,setSelectedBackground]=useState("essential-transparent"), [batch,setBatch]=useState<PdpStudioBatch|null>(null), [history,setHistory]=useState<PdpStudioBatch[]>([]), [uploadProgress,setUploadProgress]=useState(0), [busy,setBusy]=useState(false), [error,setError]=useState(""); const objectUrls=useRef<string[]>([]);
 useEffect(()=>{void listPdpStudioBatches().then(rows=>{setHistory(rows);if(rows[0]&&["queued","running"].includes(rows[0].status))setBatch(rows[0])}).catch(()=>undefined);return()=>objectUrls.current.forEach(URL.revokeObjectURL)},[]);
 useEffect(()=>{if(!batch||!["queued","running"].includes(batch.status))return;const timer=setInterval(()=>void getPdpStudioBatch(batch.id).then(setBatch).catch(()=>undefined),1500);return()=>clearInterval(timer)},[batch]);
 function addFiles(incoming:File[]){const local=incoming.slice(0,250).map(file=>({id:crypto.randomUUID(),name:file.name,previewUrl:URL.createObjectURL(file),file}));objectUrls.current.push(...local.map(x=>x.previewUrl));setFiles(local);setError("")}
 async function runBatch(){const real=files.flatMap(item=>item.file?[item.file]:[]);if(!real.length)return;setBusy(true);setError("");try{const assetIds:string[]=[];for(const [index,file] of real.entries()){assetIds.push((await uploadPdpStudioAsset(file)).id);setUploadProgress(Math.round(((index+1)/real.length)*100))}const processor=mapPdpStudioBatchPreset(selectedBackground);const created=await createPdpStudioBatch({name:`Batch ${new Date().toLocaleString()}`,toolId:processor.toolId,inputAssetIds:assetIds,...(processor.prompt?{prompt:processor.prompt}:{}),options:processor.options,useBrandKit:false});setBatch(created);setHistory(items=>[created,...items])}catch(reason){setError(reason instanceof Error?reason.message:"Batch processing failed.")}finally{setBusy(false)}}
 async function cancel(){if(batch)setBatch(await cancelPdpStudioBatch(batch.id))} async function retry(){if(batch)setBatch(await retryFailedPdpStudioBatch(batch.id))}
 return{files,selectedBackground,batch,history,uploadProgress,busy,error,addFiles,setSelectedBackground,runBatch,cancel,retry}; }
