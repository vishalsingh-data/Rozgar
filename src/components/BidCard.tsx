'use client';

import React from 'react';
import { 
  Star, 
  CheckCircle2, 
  PhoneCall, 
  Smartphone,
  IndianRupee,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface BidCardProps {
  bid: {
    id: string;
    worker_id: string;
    source: 'app' | 'missed_call';
    created_at: string;
    worker: {
      name: string;
      total_jobs: number;
      completion_rate: number | null;
      photo_url?: string;
    }
  };
  onAccept: (bidId: string) => void;
  disabled?: boolean;
}

export default function BidCard({ bid, onAccept, disabled }: BidCardProps) {
  const { worker } = bid;
  
  return (
    <Card className="overflow-hidden border-zinc-200 shadow-sm transition-all hover:shadow-md dark:border-zinc-800">
      <CardContent className="p-0">
        <div className="flex p-4">
          {/* Worker Avatar & Info */}
          <Avatar className="size-12 rounded-xl">
            <AvatarImage src={worker.photo_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {worker.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{worker.name}</h3>
              <Badge variant="outline" className="gap-1 rounded-full text-[10px] uppercase tracking-wider">
                {bid.source === 'app' ? (
                  <Smartphone className="size-3" />
                ) : (
                  <PhoneCall className="size-3" />
                )}
                {bid.source.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>{worker.total_jobs} jobs</span>
              </div>
              {worker.completion_rate && (
                <div className="flex items-center gap-1 border-l pl-3">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-zinc-900">{worker.completion_rate}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between border-t bg-zinc-50/50 p-4 dark:bg-zinc-900/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="size-3" />
              {formatDistanceToNow(new Date(bid.created_at))} ago
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="rounded-full px-6 font-bold shadow-sm"
            onClick={() => onAccept(bid.id)}
            disabled={disabled}
          >
            Accept Bid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
