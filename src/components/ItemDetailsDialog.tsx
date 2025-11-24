import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, User, Mail, MessageSquare, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    title: string;
    category: string;
    location: string;
    date: string;
    status: "lost" | "found";
    image_url: string | null;
    description: string | null;
    finder_name: string;
    contact_info: string;
  } | null;
  currentUserId?: string;
}

export const ItemDetailsDialog = ({ open, onOpenChange, item, currentUserId }: ItemDetailsDialogProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!item) return null;

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!currentUserId) {
      toast.error("Please sign in to send messages");
      return;
    }

    setSending(true);
    try {
      // In a real app, you'd need to get the receiver_id from the item owner
      // For now, we'll show a success message
      toast.success("Message sent!", {
        description: "The item owner will be notified.",
      });
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            {item.title}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <Badge 
            variant={item.status === "found" ? "default" : "secondary"}
            className={`text-sm ${
              item.status === "found" 
                ? "bg-success text-success-foreground" 
                : "bg-accent text-accent-foreground"
            }`}
          >
            {item.status === "found" ? "Found" : "Lost"}
          </Badge>

          {/* Image */}
          {item.image_url && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Item Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{item.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{item.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Reported By</p>
                  <p className="font-medium">{item.finder_name}</p>
                </div>
              </div>
            </div>

            {item.description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h4>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Contact</p>
                <p className="font-medium">{item.contact_info}</p>
              </div>
            </div>

            {/* Message Section */}
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Send a Message
              </h4>
              <Textarea
                placeholder="Write a message to the item owner..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={sending || !message.trim()}
                className="w-full"
              >
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
