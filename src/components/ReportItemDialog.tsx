import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, MapPin, Calendar, User, Mail, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface ReportItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "lost" | "found";
}

// Validation schema
const reportSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  category: z.string().min(1, "Please select a category"),
  location: z.string().trim().min(3, "Location must be at least 3 characters").max(200, "Location must be less than 200 characters"),
  date: z.string().min(1, "Please select a date"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  contactInfo: z.string().trim().min(3, "Contact info must be at least 3 characters").max(100, "Contact info must be less than 100 characters"),
  finderName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
});

export const ReportItemDialog = ({ open, onOpenChange, type }: ReportItemDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    location: "",
    date: "",
    description: "",
    contactInfo: "",
    finderName: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const categories = [
    "Bag & Luggage",
    "Electronics",
    "Keys & Accessories",
    "Wallet & Cards",
    "Jewelry",
    "Clothing",
    "Documents",
    "Pet",
    "Other",
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    try {
      reportSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setUploading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert item into database
      const { error: insertError } = await supabase
        .from('items')
        .insert({
          title: formData.title,
          category: formData.category,
          location: formData.location,
          date: formData.date,
          description: formData.description || null,
          contact_info: formData.contactInfo,
          finder_name: formData.finderName,
          status: type,
          image_url: imageUrl,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success(
        `${type === "lost" ? "Lost" : "Found"} item reported successfully!`,
        {
          description: "Your report is now visible to the community.",
        }
      );
      
      // Reset form
      setFormData({
        title: "",
        category: "",
        location: "",
        date: "",
        description: "",
        contactInfo: "",
        finderName: "",
      });
      setImageFile(null);
      setImagePreview(null);
      setErrors({});
      
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-premium bg-clip-text text-transparent">
            Report {type === "lost" ? "Lost" : "Found"} Item
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill in the details below to help reunite items with their owners. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Item Photo (Optional)
            </Label>
            <div className="flex flex-col gap-3">
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Maximum file size: 5MB. Supported formats: JPG, PNG, WebP</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Item Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Blue Backpack, iPhone 13"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold">
                Category *
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          {/* Location and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location *
              </Label>
              <Input
                id="location"
                placeholder="Where was it lost/found?"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className={errors.location ? "border-destructive" : ""}
              />
              {errors.location && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.location}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Any additional details that might help identify the item..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              maxLength={500}
              className={errors.description ? "border-destructive" : ""}
            />
            <div className="flex justify-between items-center">
              {errors.description && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {formData.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground">Contact Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finderName" className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Name *
                </Label>
                <Input
                  id="finderName"
                  placeholder="Full name"
                  value={formData.finderName}
                  onChange={(e) => handleChange("finderName", e.target.value)}
                  className={errors.finderName ? "border-destructive" : ""}
                />
                {errors.finderName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.finderName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Info *
                </Label>
                <Input
                  id="contactInfo"
                  placeholder="Email or phone number"
                  value={formData.contactInfo}
                  onChange={(e) => handleChange("contactInfo", e.target.value)}
                  className={errors.contactInfo ? "border-destructive" : ""}
                />
                {errors.contactInfo && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.contactInfo}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-premium hover:opacity-90 transition-opacity"
              disabled={uploading}
            >
              {uploading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
