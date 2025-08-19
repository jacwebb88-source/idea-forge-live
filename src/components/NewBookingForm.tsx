import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface NewBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
}

interface FormData {
  supplier_name: string;
  species: string;
  lot_id: string;
  head_count: string;
  requested_kill_date: string;
  requested_window_start: string;
  requested_window_end: string;
  notes: string;
}

export function NewBookingForm({ open, onOpenChange, onBookingCreated }: NewBookingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [formData, setFormData] = useState<FormData>({
    supplier_name: "",
    species: "",
    lot_id: "",
    head_count: "",
    requested_kill_date: "",
    requested_window_start: "",
    requested_window_end: "",
    notes: "",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Required fields
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = "Supplier/Agent is required";
    }
    if (!formData.species) {
      newErrors.species = "Species is required";
    }
    if (!formData.head_count) {
      newErrors.head_count = "Head count is required";
    }
    if (!formData.requested_kill_date) {
      newErrors.requested_kill_date = "Kill date is required";
    }
    if (!formData.requested_window_start) {
      newErrors.requested_window_start = "Window start is required";
    }
    if (!formData.requested_window_end) {
      newErrors.requested_window_end = "Window end is required";
    }

    // Business validation
    const headCount = parseInt(formData.head_count);
    if (formData.head_count && (isNaN(headCount) || headCount <= 0)) {
      newErrors.head_count = "Head count must be greater than 0";
    }

    if (formData.requested_window_start && formData.requested_window_end) {
      const startDate = new Date(formData.requested_window_start);
      const endDate = new Date(formData.requested_window_end);
      if (startDate >= endDate) {
        newErrors.requested_window_end = "Window end must be after window start";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          // Form data
          species: formData.species,
          lot_id: formData.lot_id || null,
          head_count: parseInt(formData.head_count),
          requested_kill_date: formData.requested_kill_date,
          requested_window_start: formData.requested_window_start,
          requested_window_end: formData.requested_window_end,
          
          // Hidden fields as specified
          plant_id: "148e4475-1468-4209-ba23-59d5b2707d70",
          status: "confirmed",
          
          // Additional fields (these may need to be added to the schema or handled differently)
          agent_ref: formData.supplier_name, // Using supplier_name for agent_ref for now
        });

      if (error) {
        console.error('Error creating booking:', error);
        toast({
          title: "Error",
          description: "Failed to create booking. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: "Booking created",
        description: "New booking has been successfully created.",
      });

      // Reset form and close panel
      setFormData({
        supplier_name: "",
        species: "",
        lot_id: "",
        head_count: "",
        requested_kill_date: "",
        requested_window_start: "",
        requested_window_end: "",
        notes: "",
      });
      
      onOpenChange(false);
      onBookingCreated();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Booking</SheetTitle>
          <SheetDescription>
            Create a new booking request for livestock processing.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Supplier/Agent */}
          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier/Agent *</Label>
            <Input
              id="supplier_name"
              value={formData.supplier_name}
              onChange={(e) => handleInputChange("supplier_name", e.target.value)}
              placeholder="Enter supplier or agent name"
              className={errors.supplier_name ? "border-destructive" : ""}
            />
            {errors.supplier_name && (
              <p className="text-sm text-destructive">{errors.supplier_name}</p>
            )}
          </div>

          {/* Species */}
          <div className="space-y-2">
            <Label htmlFor="species">Species *</Label>
            <Select
              value={formData.species}
              onValueChange={(value) => handleInputChange("species", value)}
            >
              <SelectTrigger className={errors.species ? "border-destructive" : ""}>
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beef">Beef</SelectItem>
                <SelectItem value="lamb">Lamb</SelectItem>
                <SelectItem value="mutton">Mutton</SelectItem>
                <SelectItem value="goat">Goat</SelectItem>
              </SelectContent>
            </Select>
            {errors.species && (
              <p className="text-sm text-destructive">{errors.species}</p>
            )}
          </div>

          {/* Lot ID */}
          <div className="space-y-2">
            <Label htmlFor="lot_id">Lot ID</Label>
            <Input
              id="lot_id"
              value={formData.lot_id}
              onChange={(e) => handleInputChange("lot_id", e.target.value)}
              placeholder="Enter lot ID (optional)"
            />
          </div>

          {/* Head Count */}
          <div className="space-y-2">
            <Label htmlFor="head_count">Head Count *</Label>
            <Input
              id="head_count"
              type="number"
              min="1"
              value={formData.head_count}
              onChange={(e) => handleInputChange("head_count", e.target.value)}
              placeholder="Enter number of animals"
              className={errors.head_count ? "border-destructive" : ""}
            />
            {errors.head_count && (
              <p className="text-sm text-destructive">{errors.head_count}</p>
            )}
          </div>

          {/* Kill Date */}
          <div className="space-y-2">
            <Label htmlFor="requested_kill_date">Requested Kill Date *</Label>
            <Input
              id="requested_kill_date"
              type="date"
              value={formData.requested_kill_date}
              onChange={(e) => handleInputChange("requested_kill_date", e.target.value)}
              className={errors.requested_kill_date ? "border-destructive" : ""}
            />
            {errors.requested_kill_date && (
              <p className="text-sm text-destructive">{errors.requested_kill_date}</p>
            )}
          </div>

          {/* Window Start */}
          <div className="space-y-2">
            <Label htmlFor="requested_window_start">Window Start *</Label>
            <Input
              id="requested_window_start"
              type="datetime-local"
              value={formData.requested_window_start}
              onChange={(e) => handleInputChange("requested_window_start", e.target.value)}
              className={errors.requested_window_start ? "border-destructive" : ""}
            />
            {errors.requested_window_start && (
              <p className="text-sm text-destructive">{errors.requested_window_start}</p>
            )}
          </div>

          {/* Window End */}
          <div className="space-y-2">
            <Label htmlFor="requested_window_end">Window End *</Label>
            <Input
              id="requested_window_end"
              type="datetime-local"
              value={formData.requested_window_end}
              onChange={(e) => handleInputChange("requested_window_end", e.target.value)}
              className={errors.requested_window_end ? "border-destructive" : ""}
            />
            {errors.requested_window_end && (
              <p className="text-sm text-destructive">{errors.requested_window_end}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes (optional)"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}