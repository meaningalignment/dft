// import { getChats, removeChat, shareChat } from "@/app/actions"
// import { SidebarActions } from "./sidebar-actions"
// import { SidebarItem } from "./sidebar-item"

// export interface SidebarListProps {
//   userId?: string
// }

// export async function SidebarList({ userId }: SidebarListProps) {
//   const chats = await getChats(userId)

//   return (
//     <div className="flex-1 overflow-auto">
//       {chats?.length ? (
//         <div className="space-y-2 px-2">
//           {chats.map(
//             (chat) =>
//               chat && (
//                 <SidebarItem key={chat?.id} chat={chat}>
//                   <SidebarActions
//                     chat={chat}
//                     removeChat={removeChat}
//                     shareChat={shareChat}
//                   />
//                 </SidebarItem>
//               )
//           )}
//         </div>
//       ) : (
//         <div className="p-8 text-center">
//           <p className="text-sm text-muted-foreground">No chat history</p>
//         </div>
//       )}
//     </div>
//   )
// }
