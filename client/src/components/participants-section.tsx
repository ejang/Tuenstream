import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";
import type { Participant } from "@shared/schema";

interface ParticipantsSectionProps {
  participants: Participant[];
}

export default function ParticipantsSection({ participants }: ParticipantsSectionProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-light text-foreground mb-4">Listeners</h2>
      
      <div className="bg-primary rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="bg-secondary/20 px-3 py-1.5 text-center border-b border-border">
          <div className="text-xs font-mono text-muted-foreground">Connected Users</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex flex-col items-center space-y-1.5">
                <div className="w-8 h-8 bg-accent rounded-lg border border-border flex items-center justify-center">
                  <span className="text-foreground font-medium text-xs">{participant.initials}</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground truncate max-w-16 leading-tight">{participant.name}</p>
                  <div className="flex items-center justify-center space-x-1 mt-0.5">
                    <Music className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">{participant.songsAdded}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
