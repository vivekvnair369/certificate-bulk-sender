import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Image as ImageIcon,
  Type,
  Layout,
  Save,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

const FONT_OPTIONS = [
  "Times New Roman",
  "Arial",
  "Georgia",
  "Montserrat",
  "Playfair Display",
  "Great Vibes",
  "Alex Brush"
];

export default function CertificateTemplates() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.sender.listTemplates.useQuery();
  const createMutation = trpc.sender.createTemplate.useMutation();
  const updateMutation = trpc.sender.updateTemplate.useMutation();
  const deleteMutation = trpc.sender.deleteTemplate.useMutation();

  // Screen state
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [previewWidth, setPreviewWidth] = useState(800);
  const [previewHeight, setPreviewHeight] = useState(600);

  // Layout Positioning state (0 to 100 percents)
  const [nameX, setNameX] = useState(50);
  const [nameY, setNameY] = useState(45);
  const [nameFont, setNameFont] = useState("Times New Roman");
  const [nameFontSize, setNameFontSize] = useState(19);
  const [nameColor, setNameColor] = useState("#000000");

  const [eventX, setEventX] = useState(50);
  const [eventY, setEventY] = useState(65);
  const [eventFont, setEventFont] = useState("Times New Roman");
  const [eventFontSize, setEventFontSize] = useState(19);
  const [eventColor, setNameEventColor] = useState("#000000");

  const [collegeX, setCollegeX] = useState(50);
  const [collegeY, setCollegeY] = useState(55);
  const [collegeFont, setCollegeFont] = useState("Times New Roman");
  const [collegeFontSize, setCollegeFontSize] = useState(19);
  const [collegeColor, setCollegeColor] = useState("#000000");

  // Read file as base64 helper
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageBase64(result);

      // Measure dimensions in client side
      const img = new Image();
      img.onload = () => {
        setPreviewWidth(img.naturalWidth);
        setPreviewHeight(img.naturalHeight);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Reset uploader form
  const resetForm = () => {
    setName("");
    setImageFile(null);
    setImageBase64("");
    setNameX(50);
    setNameY(45);
    setNameFont("Arial");
    setNameFontSize(36);
    setNameColor("#000000");
    setEventX(50);
    setEventY(65);
    setEventFont("Arial");
    setEventFontSize(24);
    setNameEventColor("#000000");
    setCollegeX(50);
    setCollegeY(55);
    setCollegeFont("Arial");
    setCollegeFontSize(24);
    setCollegeColor("#000000");
  };

  // Submit layout details
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!imageBase64 && view === "create") {
      toast.error("Please upload a template image");
      return;
    }

    try {
      // Calculate absolute positions based on real width/height
      const absoluteNameX = Math.round((nameX / 100) * previewWidth);
      const absoluteNameY = Math.round((nameY / 100) * previewHeight);
      const absoluteEventX = Math.round((eventX / 100) * previewWidth);
      const absoluteEventY = Math.round((eventY / 100) * previewHeight);
      const absoluteCollegeX = Math.round((collegeX / 100) * previewWidth);
      const absoluteCollegeY = Math.round((collegeY / 100) * previewHeight);

      if (view === "create") {
        await createMutation.mutateAsync({
          name,
          imageBase64,
          fileName: imageFile?.name || "template.png",
          nameX: absoluteNameX,
          nameY: absoluteNameY,
          nameFont,
          nameFontSize,
          nameColor,
          eventX: absoluteEventX,
          eventY: absoluteEventY,
          eventFont,
          eventFontSize,
          eventColor,
          collegeX: absoluteCollegeX,
          collegeY: absoluteCollegeY,
          collegeFont,
          collegeFontSize,
          collegeColor,
        });
        toast.success("Certificate template created successfully!");
      } else if (view === "edit" && selectedTemplate) {
        await updateMutation.mutateAsync({
          id: selectedTemplate.id,
          name,
          nameX: absoluteNameX,
          nameY: absoluteNameY,
          nameFont,
          nameFontSize,
          nameColor,
          eventX: absoluteEventX,
          eventY: absoluteEventY,
          eventFont,
          eventFontSize,
          eventColor,
          collegeX: absoluteCollegeX,
          collegeY: absoluteCollegeY,
          collegeFont,
          collegeFontSize,
          collegeColor,
        });
        toast.success("Certificate template updated successfully!");
      }

      utils.sender.listTemplates.invalidate();
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to save template layout");
    }
  };

  // Delete handler
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template layout?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Template deleted successfully");
      utils.sender.listTemplates.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  // Enter edit mode (read absolute values and map them to percentage sliders)
  const enterEditMode = (template: any) => {
    setSelectedTemplate(template);
    setName(template.name);
    setPreviewWidth(template.width);
    setPreviewHeight(template.height);

    // Map pixels back to percentages for sliders
    setNameX(Math.round((parseFloat(template.nameX) / template.width) * 100));
    setNameY(Math.round((parseFloat(template.nameY) / template.height) * 100));
    setNameFont(template.nameFont);
    setNameFontSize(template.nameFontSize);
    setNameColor(template.nameColor);

    setEventX(Math.round((parseFloat(template.eventX) / template.width) * 100));
    setEventY(Math.round((parseFloat(template.eventY) / template.height) * 100));
    setEventFont(template.eventFont);
    setEventFontSize(template.eventFontSize);
    setNameEventColor(template.eventColor);

    setCollegeX(template.collegeX ? Math.round((parseFloat(template.collegeX) / template.width) * 100) : 50);
    setCollegeY(template.collegeY ? Math.round((parseFloat(template.collegeY) / template.height) * 100) : 55);
    setCollegeFont(template.collegeFont || "Times New Roman");
    setCollegeFontSize(template.collegeFontSize || 19);
    setCollegeColor(template.collegeColor || "#000000");

    // Set signed URL for editing visual overlay
    setImageBase64(template.imageUrl);
    setView("edit");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-10 w-10 text-[#20B2AA] animate-spin mb-4" />
        <p className="text-sm">Loading certificate templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === "list" ? (
        // LIST VIEW
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0A2540]">Templates</h1>
              <p className="text-slate-500 mt-1">Design and configure variables on your certificate sheets.</p>
            </div>
            <Button onClick={() => { resetForm(); setView("create"); }} className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Layout
            </Button>
          </div>

          {templates && templates.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="border-0 shadow-sm overflow-hidden bg-white flex flex-col group">
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden border-b flex items-center justify-center">
                    <img
                      src={template.imageUrl}
                      alt={template.name}
                      className="object-contain w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <CardHeader className="p-4 flex-1">
                    <CardTitle className="text-base text-[#0A2540] truncate">{template.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Dimensions: {template.width}px × {template.height}px
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 bg-slate-50/50 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enterEditMode(template)}
                      className="text-[#0A2540] border-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> View Config
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-xl py-20 bg-white text-slate-400">
              <ImageIcon className="h-12 w-12 text-slate-300 mb-2 stroke-[1.5]" />
              <h3 className="font-semibold text-slate-600 text-sm">No templates configured</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Upload a certificate image template, position participant attributes visually, and customize layout sizes.
              </p>
              <Button onClick={() => { resetForm(); setView("create"); }} className="mt-4 bg-[#20B2AA] hover:bg-[#1a948e] text-white">
                Upload First Template
              </Button>
            </div>
          )}
        </>
      ) : (
        // CREATE & EDIT VISUAL EDITOR
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setView("list")} className="text-slate-500 hover:text-[#0A2540]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#0A2540]">
                {view === "create" ? "Create Certificate Template" : "Template Layout Configuration"}
              </h1>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Control Panel Card */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-[#0A2540] flex items-center gap-1.5">
                    <Layout className="h-4 w-4 text-[#20B2AA]" /> Layout Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Name */}
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g. Hackathon Winner Certificate"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={view === "edit"}
                      className="border-slate-200 focus-visible:ring-[#20B2AA]"
                    />
                  </div>

                  {/* Upload Area */}
                  {view === "create" && (
                    <div className="space-y-2">
                      <Label>Template File (PNG/JPEG)</Label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Plus className="h-6 w-6 text-slate-400 mb-1" />
                            <p className="text-xs text-slate-500 font-medium">Click to select image file</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      {imageFile && (
                        <p className="text-xs text-[#20B2AA] font-semibold mt-1">
                          ✓ File selected: {imageFile.name} ({previewWidth}x{previewHeight}px)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Attribute Styling & Position */}
                  {imageBase64 && (
                    <div className="space-y-6 pt-4 border-t">
                      {/* Name styling */}
                      <div className="space-y-3">
                        <span className="text-sm font-bold text-[#0A2540] flex items-center gap-1">
                          <Type className="h-3.5 w-3.5" /> Participant Name Variable
                        </span>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Family</Label>
                            <Select value={nameFont} onValueChange={setNameFont}>
                              <SelectTrigger className="h-8 text-xs border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map(f => (
                                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Size (px)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs border-slate-200"
                              value={nameFontSize}
                              onChange={(e) => setNameFontSize(parseInt(e.target.value) || 12)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Font Color (Hex)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              className="w-8 h-8 p-0.5 border border-slate-200 rounded cursor-pointer"
                              value={nameColor}
                              onChange={(e) => setNameColor(e.target.value)}
                            />
                            <Input
                              type="text"
                              className="h-8 text-xs flex-1 border-slate-200 uppercase font-mono"
                              value={nameColor}
                              onChange={(e) => setNameColor(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Horizontal Alignment (X)</Label>
                            <span className="text-[11px] font-semibold">{nameX}%</span>
                          </div>
                          <Slider value={[nameX]} onValueChange={([val]) => setNameX(val)} max={100} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Vertical Alignment (Y)</Label>
                            <span className="text-[11px] font-semibold">{nameY}%</span>
                          </div>
                          <Slider value={[nameY]} onValueChange={([val]) => setNameY(val)} max={100} step={1} />
                        </div>
                      </div>

                      {/* Event styling */}
                      <div className="space-y-3 pt-4 border-t">
                        <span className="text-sm font-bold text-[#0A2540] flex items-center gap-1">
                          <Type className="h-3.5 w-3.5" /> Event Name Variable
                        </span>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Family</Label>
                            <Select value={eventFont} onValueChange={setEventFont}>
                              <SelectTrigger className="h-8 text-xs border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map(f => (
                                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Size (px)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs border-slate-200"
                              value={eventFontSize}
                              onChange={(e) => setEventFontSize(parseInt(e.target.value) || 12)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Font Color (Hex)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              className="w-8 h-8 p-0.5 border border-slate-200 rounded cursor-pointer"
                              value={eventColor} // Fix nameColor reference bug
                              onChange={(e) => setNameEventColor(e.target.value)}
                            />
                            <Input
                              type="text"
                              className="h-8 text-xs flex-1 border-slate-200 uppercase font-mono"
                              value={eventColor}
                              onChange={(e) => setNameEventColor(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Horizontal Alignment (X)</Label>
                            <span className="text-[11px] font-semibold">{eventX}%</span>
                          </div>
                          <Slider value={[eventX]} onValueChange={([val]) => setEventX(val)} max={100} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Vertical Alignment (Y)</Label>
                            <span className="text-[11px] font-semibold">{eventY}%</span>
                          </div>
                          <Slider value={[eventY]} onValueChange={([val]) => setEventY(val)} max={100} step={1} />
                        </div>
                      </div>

                      {/* College styling */}
                      <div className="space-y-3 pt-4 border-t">
                        <span className="text-sm font-bold text-[#0A2540] flex items-center gap-1">
                          <Type className="h-3.5 w-3.5" /> College Name Variable
                        </span>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Family</Label>
                            <Select value={collegeFont} onValueChange={setCollegeFont}>
                              <SelectTrigger className="h-8 text-xs border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map(f => (
                                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Font Size (px)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs border-slate-200"
                              value={collegeFontSize}
                              onChange={(e) => setCollegeFontSize(parseInt(e.target.value) || 12)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Font Color (Hex)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              className="w-8 h-8 p-0.5 border border-slate-200 rounded cursor-pointer"
                              value={collegeColor}
                              onChange={(e) => setCollegeColor(e.target.value)}
                            />
                            <Input
                              type="text"
                              className="h-8 text-xs flex-1 border-slate-200 uppercase font-mono"
                              value={collegeColor}
                              onChange={(e) => setCollegeColor(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Horizontal Alignment (X)</Label>
                            <span className="text-[11px] font-semibold">{collegeX}%</span>
                          </div>
                          <Slider value={[collegeX]} onValueChange={([val]) => setCollegeX(val)} max={100} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-[11px] text-slate-500">Vertical Alignment (Y)</Label>
                            <span className="text-[11px] font-semibold">{collegeY}%</span>
                          </div>
                          <Slider value={[collegeY]} onValueChange={([val]) => setCollegeY(val)} max={100} step={1} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                {imageBase64 && (
                  <CardFooter className="p-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setView("list")} className="border-slate-200">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-[#20B2AA] hover:bg-[#1a948e] text-white"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Save Layout
                        </>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>

            {/* Live Preview Display Canvas */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm bg-white overflow-hidden flex flex-col h-full">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base text-[#0A2540]">Live Preview Sandbox</CardTitle>
                  <CardDescription>Visual rendering of text overlays on template sheet</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 bg-slate-50/50 p-6 flex items-center justify-center min-h-[300px]">
                  {imageBase64 ? (
                    <div className="relative shadow-lg border rounded overflow-hidden max-w-full" style={{ maxHeight: "550px" }}>
                      <img
                        src={imageBase64}
                        alt="Live Editor Preview"
                        className="object-contain max-w-full"
                        style={{ maxHeight: "550px" }}
                      />

                      {/* Overlays */}
                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center whitespace-nowrap"
                        style={{
                          left: `${nameX}%`,
                          top: `${nameY}%`,
                          fontFamily: nameFont,
                          fontSize: `${nameFontSize / 2}px`, // Scaled for preview container
                          color: nameColor,
                          fontWeight: "bold",
                        }}
                      >
                        [ Participant Name ]
                      </div>

                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center whitespace-nowrap"
                        style={{
                          left: `${eventX}%`,
                          top: `${eventY}%`,
                          fontFamily: eventFont,
                          fontSize: `${eventFontSize / 2}px`, // Scaled for preview container
                          color: eventColor,
                          fontWeight: "bold",
                        }}
                      >
                        [ Event Name ]
                      </div>

                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center whitespace-nowrap"
                        style={{
                          left: `${collegeX}%`,
                          top: `${collegeY}%`,
                          fontFamily: collegeFont,
                          fontSize: `${collegeFontSize / 2}px`, // Scaled for preview container
                          color: collegeColor,
                          fontWeight: "bold",
                        }}
                      >
                        [ College Name ]
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                      <ImageIcon className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
                      <p className="text-sm">Please upload or select template file first</p>
                      <p className="text-xs text-slate-400 mt-1">Live preview overlay will render here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
