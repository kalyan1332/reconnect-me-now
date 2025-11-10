import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

interface ItemCardProps {
  image: string;
  title: string;
  category: string;
  location: string;
  date: string;
  status: "lost" | "found";
}

export const ItemCard = ({ image, title, category, location, date, status }: ItemCardProps) => {
  return (
    <Card className="group overflow-hidden border-border bg-card shadow-card hover:shadow-soft transition-smooth cursor-pointer">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-smooth group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <Badge 
            variant={status === "found" ? "default" : "secondary"}
            className={status === "found" 
              ? "bg-success text-success-foreground" 
              : "bg-accent text-accent-foreground"
            }
          >
            {status === "found" ? "Found" : "Lost"}
          </Badge>
        </div>
      </div>
      
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{category}</p>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
