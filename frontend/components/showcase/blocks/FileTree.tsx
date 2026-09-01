"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export type FileNode = {
  name: string
  children?: FileNode[]
}

export type FileTreeProps = {
  nodes: FileNode[]
  className?: string
}

function TreeItem({ node, depth }: { node: FileNode; depth: number }) {
  const isFolder = Array.isArray(node.children)
  const [open, setOpen] = useState(depth === 0)

  return (
    <li>
      <button
        type="button"
        onClick={() => isFolder && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm text-foreground transition-colors hover:bg-muted",
          !isFolder && "cursor-default"
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {isFolder ? (
          <>
            {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {open ? <FolderOpen className="h-4 w-4 text-blue-500" /> : <Folder className="h-4 w-4 text-blue-500" />}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <File className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && (
        <ul>
          {node.children?.map((child, index) => (
            <TreeItem key={child.name + index} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FileTree({ nodes, className }: FileTreeProps) {
  return (
    <ul className={cn("w-full max-w-xs rounded-lg border border-border bg-card p-2 shadow-sm", className)}>
      {nodes.map((node, index) => (
        <TreeItem key={node.name + index} node={node} depth={0} />
      ))}
    </ul>
  )
}
