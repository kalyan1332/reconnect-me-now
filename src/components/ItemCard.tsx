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
    <Card className="group overflow-hidden border-border bg-card shadow-card hover:shadow-elevated transition-smooth cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-smooth group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
        <div className="absolute top-3 right-3">
          <Badge 
            variant={status === "found" ? "default" : "secondary"}
            className={`${
              status === "found" 
                ? "bg-success text-success-foreground shadow-lg" 
                : "bg-accent text-accent-foreground shadow-lg"
            } font-semibold`}
          >
            {status === "found" ? "Found" : "Lost"}
          </Badge>
        </div>
      </div>
      
      <div className="p-5 space-y-3 bg-gradient-card">
        <div>
          <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{title}</h3>
          <p className="text-sm font-medium text-primary">{category}</p>
        </div>
        
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
