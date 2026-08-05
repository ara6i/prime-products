"use client";
import { useEffect, useState } from "react";
import { getPdpStudioBrandKit, updatePdpStudioBrandKit } from "../../platform/services/pdpStudioBrandKitService";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
interface BrandInfoState { name:string;description:string;website:string;instagram:string;style:string;colors:string[];fonts:string[];logos:PdpStudioAsset[];references:PdpStudioAsset[] }
const EMPTY:BrandInfoState={name:"",description:"",website:"",instagram:"",style:"",colors:[],fonts:[],logos:[],references:[]};
export function useBrandKitUi(){const[activeTab,setActiveTab]=useState<"assets"|"info">("assets"),[brandInfo,setBrandInfo]=useState(EMPTY),[saved,setSaved]=useState(false),[assetNotice,setAssetNotice]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{void getPdpStudioBrandKit().then(kit=>setBrandInfo({name:kit.name,description:kit.description,website:kit.website,instagram:kit.instagram,style:kit.writtenDirection,colors:kit.colors,fonts:kit.fonts,logos:kit.logos,references:kit.references})).catch(error=>setAssetNotice(error instanceof Error?error.message:"Unable to load Brand Kit.")).finally(()=>setLoading(false))},[]);
 function setField<K extends keyof BrandInfoState>(key:K,value:BrandInfoState[K]){setBrandInfo(current=>({...current,[key]:value}));setSaved(false)}
 async function save(){setSaving(true);setAssetNotice("");try{const kit=await updatePdpStudioBrandKit({name:brandInfo.name,description:brandInfo.description,website:brandInfo.website,instagram:brandInfo.instagram,writtenDirection:brandInfo.style,colors:brandInfo.colors,fonts:brandInfo.fonts,logoAssetIds:brandInfo.logos.map(x=>x.id),referenceAssetIds:brandInfo.references.map(x=>x.id)});setBrandInfo(current=>({...current,logos:kit.logos,references:kit.references}));setSaved(true)}catch(error){setAssetNotice(error instanceof Error?error.message:"Unable to save Brand Kit.")}finally{setSaving(false)}}
 async function upload(kind:"logos"|"references",file:File){setAssetNotice(`Uploading ${file.name}…`);try{const asset=await uploadPdpStudioAsset(file,"brand-kit");setBrandInfo(current=>({...current,[kind]:[...current[kind],asset]}));setAssetNotice(`${file.name} added. Save the Brand Kit to finish.`);setSaved(false)}catch(error){setAssetNotice(error instanceof Error?error.message:"Upload failed.")}}
 return{activeTab,brandInfo,saved,assetNotice,loading,saving,setActiveTab,setField,setAssetNotice,save,upload};}
