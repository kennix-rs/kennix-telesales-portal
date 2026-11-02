import { Badge } from './ui'
import { stageTone } from '../lib/utils'
import type { Priority, Stage } from '../types'
export function StageBadge({ stage }: { stage: Stage }) { return <Badge tone={stageTone(stage)}>{stage === 'Qualified' ? 'Sent to Sales' : stage}</Badge> }
export function PriorityBadge({ priority }: { priority: Priority }) { return <Badge tone={priority === 'High' ? 'red' : priority === 'Medium' ? 'amber' : 'slate'}>{priority}</Badge> }
