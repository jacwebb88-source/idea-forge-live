import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Calendar } from "lucide-react";
import { useState } from "react";

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

export default function BuyerSupplierRequest() {
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
      newErrors.supplier_name = "Supplier/Agent name is required";
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
          status: "requested",
          
          // Additional fields
          agent_ref: formData.supplier_name, // Using supplier_name for agent_ref for now
        });

      if (error) {
        console.error('Error creating booking request:', error);
        toast({
          title: "Error",
          description: "Failed to submit booking request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: "Thanks — we'll be in touch to confirm.",
        description: "Your booking request has been submitted successfully.",
      });

      // Clear form
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
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Intake Form</h1>
            <p className="text-muted-foreground">Submit a new livestock processing booking request</p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Booking Intake Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier/Agent */}
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Supplier/Agent Name *</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange("supplier_name", e.target.value)}
                  placeholder="Enter your company or agent name"
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
                    <SelectValue placeholder="Select livestock species" />
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
                  placeholder="Enter lot identification (optional)"
                />
              </div>

              {/* Head Count */}
              <div className="space-y-2">
                <Label htmlFor="head_count">Number of Animals *</Label>
                <Input
                  id="head_count"
                  type="number"
                  min="1"
                  value={formData.head_count}
                  onChange={(e) => handleInputChange("head_count", e.target.value)}
                  placeholder="Enter total head count"
                  className={errors.head_count ? "border-destructive" : ""}
                />
                {errors.head_count && (
                  <p className="text-sm text-destructive">{errors.head_count}</p>
                )}
              </div>

              {/* Kill Date */}
              <div className="space-y-2">
                <Label htmlFor="requested_kill_date">Requested Processing Date *</Label>
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

              {/* Time Window */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requested_window_start">Preferred Start Time *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="requested_window_end">Preferred End Time *</Label>
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
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Enter any additional requirements or special instructions (optional)"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              <h3 className="font-medium text-foreground mb-2">What happens next?</h3>
              <ul className="space-y-1">
                <li>• Your request will be reviewed by our scheduling team</li>
                <li>• We'll contact you within 24 hours to confirm availability</li>
                <li>• Once confirmed, you'll receive detailed processing instructions</li>
                <li>• Transport arrangements and timing will be coordinated with you</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}