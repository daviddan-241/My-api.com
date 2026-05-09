export type Role = "user" | "assistant";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "text";
  dataUrl?: string;
  content?: string;
  mimeType?: string;
}

export interface UserItem   { id: string; role: "user";      content: string; attachments?: Attachment[] }
export interface TextItem   { id: string; role: "assistant"; kind: "text";          content: string; streaming?: boolean; model?: string }
export interface ImageItem  { id: string; role: "assistant"; kind: "image";         dataUrl: string; prompt: string; model?: string }
export interface LoadItem   { id: string; role: "assistant"; kind: "image-loading"; prompt: string }
export interface ErrorItem  { id: string; role: "assistant"; kind: "error";         content: string }

export type ChatItem = UserItem | TextItem | ImageItem | LoadItem | ErrorItem;

export interface Tab { id: string; name: string; items: ChatItem[] }
