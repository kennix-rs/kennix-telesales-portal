import { Badge } from './ui'
import { stageTone } from '../lib/utils'
import type { Priority, Stage } from '../types'
const stageLabel: Record<Stage, string> = {
  New: 'New',
  Attempted: 'Follow-up',
  Contacted: 'Interested',
  Qualification: 'Interested',
  Qualified: 'Sent to Sales',
  Nurture: 'Interested',
  Lost: 'Dead',
}
export function StageBadge({ stage }: { stage: Stage }) { return <Badge tone={stageTone(stage)}>{stageLabel[stage]}</Badge> }
export function PriorityBadge({ priority }: { priority: Priority }) { return <Badge tone={priority === 'High' ? 'red' : priority === 'Medium' ? 'amber' : 'slate'}>{priority}</Badge> }
