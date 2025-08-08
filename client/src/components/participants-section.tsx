import { Card, CardContent } from "@/components/ui/card";
import type { Participant } from "@shared/schema";

interface ParticipantsSectionProps {
  participants: Participant[];
}

export default function ParticipantsSection({ participants }: ParticipantsSectionProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium text-secondary mb-6">Active Participants</h2>
      
      <Card className="bg-primary border border-accent minimal-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-secondary font-medium text-sm">{participant.initials}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-secondary truncate max-w-20">{participant.name}</p>
                  <p className="text-xs text-text">{participant.songsAdded} songs</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
