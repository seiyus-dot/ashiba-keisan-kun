import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PartResult } from "@/lib/types"

interface Props {
  parts: PartResult[]
}

export default function PartsResultTable({ parts }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>部材名</TableHead>
          <TableHead className="text-right">数量</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parts.map((p) => (
          <TableRow key={p.name}>
            <TableCell>{p.name}</TableCell>
            <TableCell className="text-right">{p.quantity.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
