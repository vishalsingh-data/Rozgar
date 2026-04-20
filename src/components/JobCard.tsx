'use client';

import React from 'react';
import { 
  MapPin, 
  IndianRupee, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: {
    id: string;
    raw_description: string;
    interpreted_category: string;
    ai_base_price: number | null;
    pincode: string;
    created_at: string;
    worker_tags_required?: string[];
  };
  onClick: (id: string) => void;
  isAdjacent?: boolean;
}

export default function JobCard({ job, onClick, isAdjacent }: JobCardProps) {
  return (
    <Card className="group overflow-hidden border-zinc-200 transition-all hover:border-primary/30 hover:shadow-md dark:border-zinc-800">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="secondary" className="bg-primary/5 text-primary">
            {job.interpreted_category}
          </Badge>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Clock className="size-3" />
            {formatDistanceToNow(new Date(job.created_at))} ago
          </div>
        </div>

        <h3 className="line-clamp-2 min-h-[3rem] text-lg font-bold leading-tight text-zinc-900 dark:text-white">
          {job.raw_description}
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.worker_tags_required?.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
              #{tag}
            </span>
          ))}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between bg-zinc-50/50 p-4 dark:bg-zinc-900/20">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <MapPin className="size-3" />
            {job.pincode}
            {isAdjacent && (
              <span className="text-[10px] text-zinc-400 italic">(Adjacent)</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-primary">
            <IndianRupee className="size-3.5" />
            {job.ai_base_price || 'Negotiable'}
          </div>
        </div>

        <Button 
          size="sm" 
          className="rounded-full gap-1.5 px-4 font-bold transition-all group-hover:bg-primary/90"
          onClick={() => onClick(job.id)}
        >
          View & Bid
          <ArrowRight className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function Separator() {
  return <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />;
}
