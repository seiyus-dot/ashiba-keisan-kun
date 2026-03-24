import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FaceResult } from "@/lib/types"

interface Props {
  faces: FaceResult[]
}

export default function FaceResultTable({ faces }: Props) {
  const totalBody = faces.reduce((sum, f) => sum + f.body_area, 0)
  const totalScaffold = faces.reduce((sum, f) => sum + f.scaffold_area, 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>面</TableHead>
          <TableHead className="text-right">躯体㎡</TableHead>
          <TableHead className="text-right">足場㎡</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {faces.map((f) => (
          <TableRow key={f.face}>
            <TableCell className="font-medium">{f.face}</TableCell>
            <TableCell className="text-right">{f.body_area.toLocaleString()}</TableCell>
            <TableCell className="text-right">{f.scaffold_area.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-bold">合計</TableCell>
          <TableCell className="text-right font-bold">{totalBody.toLocaleString()}</TableCell>
          <TableCell className="text-right font-bold">{totalScaffold.toLocaleString()}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
