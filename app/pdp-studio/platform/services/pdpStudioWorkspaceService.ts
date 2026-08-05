import{pdpStudioApiRequest}from"./pdpStudioApiClient";
export interface WorkspaceSettings{language:string;appearance:"light"|"system";exportFormat:"png"|"jpeg"|"webp";exportQuality:number;contentSafety:boolean;defaultWidth:number;defaultHeight:number;description:string}
export interface WorkspaceDto{id:string;name:string;slug:string;role:"owner"|"admin"|"editor"|"reviewer"|"viewer";active:boolean}
export const listWorkspaces=async()=>(await pdpStudioApiRequest<{ok:true;workspaces:WorkspaceDto[]}>("/workspaces")).workspaces;
export const createWorkspace=async(name:string)=>(await pdpStudioApiRequest<{ok:true;workspace:WorkspaceDto}>("/workspaces",{method:"POST",body:JSON.stringify({name})})).workspace;
export const activateWorkspace=async(id:string)=>pdpStudioApiRequest(`/workspaces/${id}/activate`,{method:"POST"});
export const getWorkspaceSettings=async()=>(await pdpStudioApiRequest<{ok:true;settings:WorkspaceSettings}>("/workspaces/settings")).settings;
export const updateWorkspaceSettings=async(input:WorkspaceSettings)=>(await pdpStudioApiRequest<{ok:true;settings:WorkspaceSettings}>("/workspaces/settings",{method:"PUT",body:JSON.stringify(input)})).settings;
export const listWorkspaceMembers=async(id:string)=>(await pdpStudioApiRequest<{ok:true;members:Array<{accountId:string;name:string;email:string;role:string;joinedAt:string}>}>(`/workspaces/${id}/members`)).members;
export const inviteWorkspaceMember=async(id:string,email:string,role:string)=>(await pdpStudioApiRequest<{ok:true;invitation:{email:string;role:string;expiresAt:string;token:string}}>(`/workspaces/${id}/invitations`,{method:"POST",body:JSON.stringify({email,role,expiresInDays:7})})).invitation;
export interface UsageDto{credits:{used:number;limit:number};exports:{used:number;limit:number};entries:unknown[]}
export const getPdpUsage=async()=>(await pdpStudioApiRequest<{ok:true;usage:UsageDto}>("/usage")).usage;
export const getPdpBilling=async()=>(await pdpStudioApiRequest<{ok:true;billing:{plan:string;status:string;checkoutReady:boolean;limits:{credits:number;exports:number;batch:number;quality:string};plans:Record<string,unknown>}}>("/billing")).billing;
