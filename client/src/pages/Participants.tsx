import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Upload, 
  Send, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function Participants() {
  const utils = trpc.useUtils();
  
  // Queries
  const { data: templates } = trpc.sender.listTemplates.useQuery();
  const [isPolling, setIsPolling] = useState(false);
  const { data: participants, isLoading } = trpc.sender.listParticipants.useQuery(undefined, {
    refetchInterval: isPolling ? 3000 : false,
  });

  // Mutations
  const createMutation = trpc.sender.createParticipant.useMutation();
  const updateMutation = trpc.sender.updateParticipant.useMutation();
  const deleteMutation = trpc.sender.deleteParticipant.useMutation();
  const importCSVMutation = trpc.sender.importCSV.useMutation();
  const sendBulkMutation = trpc.sender.sendBulk.useMutation();

  // Selected template & participants
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [event, setEvent] = useState("");
  const [currentEditParticipant, setCurrentEditParticipant] = useState<any>(null);
  const [csvContent, setCsvContent] = useState("");

  // Check if any participants are currently sending
  useEffect(() => {
    if (participants) {
      const hasActiveSends = participants.some(p => p.sendStatus === "pending" && p.sendAttempts > 0);
      setIsPolling(hasActiveSends);
    }
  }, [participants]);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && participants) {
      setSelectedParticipantIds(participants.map(p => p.id));
    } else {
      setSelectedParticipantIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedParticipantIds(prev => [...prev, id]);
    } else {
      setSelectedParticipantIds(prev => prev.filter(pId => pId !== id));
    }
  };

  // Add Participant Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !event) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createMutation.mutateAsync({ name, email, event });
      toast.success("Participant added successfully");
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setEvent("");
      utils.sender.listParticipants.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add participant");
    }
  };

  // Edit Participant Form Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditParticipant || !name || !email || !event) return;

    try {
      await updateMutation.mutateAsync({
        id: currentEditParticipant.id,
        name,
        email,
        event,
        sendStatus: currentEditParticipant.sendStatus,
      });
      toast.success("Participant details updated");
      setIsEditOpen(false);
      utils.sender.listParticipants.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update participant");
    }
  };

  // CSV file change handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  // CSV import Submit
  const handleCsvSubmit = async () => {
    if (!csvContent) {
      toast.error("Please select a CSV file first");
      return;
    }

    try {
      const result = await importCSVMutation.mutateAsync({ csvContent });
      toast.success(`Successfully imported ${result.count} participants`);
      setIsCsvOpen(false);
      setCsvContent("");
      utils.sender.listParticipants.invalidate();
    } catch (err: any) {
      toast.error(err.message || "CSV parse error: ensure columns are named Name, Email, Event");
    }
  };

  // Send Bulk Dispatch handler
  const handleSendBulk = async () => {
    if (selectedParticipantIds.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    if (!selectedTemplateId) {
      toast.error("Please select a certificate template layout");
      return;
    }

    try {
      setIsPolling(true);
      await sendBulkMutation.mutateAsync({
        participantIds: selectedParticipantIds,
        templateId: parseInt(selectedTemplateId),
      });
      toast.success("Bulk dispatch pipeline started in background!");
      setSelectedParticipantIds([]);
      utils.sender.listParticipants.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate sending");
    }
  };

  // Single Delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this participant?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Participant removed");
      utils.sender.listParticipants.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove participant");
    }
  };

  // Open Edit Form
  const openEdit = (participant: any) => {
    setCurrentEditParticipant(participant);
    setName(participant.name);
    setEmail(participant.email);
    setEvent(participant.event);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-10 w-10 text-[#20B2AA] animate-spin mb-4" />
        <p className="text-sm">Loading participants directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A2540]">Participants</h1>
          <p className="text-slate-500 mt-1">Upload recipient sheets, manage columns, and run certificate dispatches.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCsvOpen(true)} variant="outline" className="border-slate-200 text-[#0A2540]">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => { setName(""); setEmail(""); setEvent(""); setIsAddOpen(true); }} className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Recipient
          </Button>
        </div>
      </div>

      {/* Bulk Dispatch Controls Card */}
      {participants && participants.length > 0 && (
        <Card className="border-0 shadow-sm bg-white border-l-4 border-l-[#20B2AA]">
          <CardHeader className="py-4">
            <CardTitle className="text-base text-[#0A2540] flex items-center gap-2">
              <Send className="h-4 w-4 text-[#20B2AA]" /> Bulk Distribution Center
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex-1 flex flex-col md:flex-row gap-3">
              {/* Template selection dropdown */}
              <div className="w-full md:w-64 space-y-1">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Choose Certificate Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates && templates.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center text-sm text-slate-500 font-medium">
                {selectedParticipantIds.length} recipient(s) selected for bulk dispatch
              </div>
            </div>
            <Button 
              onClick={handleSendBulk} 
              disabled={selectedParticipantIds.length === 0 || !selectedTemplateId || sendBulkMutation.isPending}
              className="bg-[#0A2540] hover:bg-[#123659] text-white"
            >
              {sendBulkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Blast Certificates
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Table List */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {participants && participants.length > 0 ? (
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="py-4 px-6 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 accent-[#20B2AA]"
                        checked={selectedParticipantIds.length === participants.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="py-4 px-6 font-semibold">Name</th>
                    <th className="py-4 px-6 font-semibold">Email</th>
                    <th className="py-4 px-6 font-semibold">Event Name</th>
                    <th className="py-4 px-6 font-semibold">Delivery Status</th>
                    <th className="py-4 px-6 font-semibold">Certificate</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const isChecked = selectedParticipantIds.includes(p.id);
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 accent-[#20B2AA]"
                            checked={isChecked}
                            onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                          />
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-[#0A2540]">{p.name}</td>
                        <td className="py-3.5 px-6 text-slate-500">{p.email}</td>
                        <td className="py-3.5 px-6 text-slate-500">{p.event}</td>
                        <td className="py-3.5 px-6">
                          {p.sendStatus === "sent" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="h-3 w-3" /> Sent
                            </span>
                          ) : p.sendStatus === "failed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 group relative cursor-help">
                              <XCircle className="h-3 w-3" /> Failed
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded shadow max-w-[200px] whitespace-normal z-50">
                                {p.lastError || "Unknown error"}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {p.certificateUrl ? (
                            <a 
                              href={p.certificateUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[#20B2AA] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              View PDF <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium">Not Generated</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openEdit(p)}
                            className="text-slate-500 hover:text-[#0A2540]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(p.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="h-12 w-12 text-slate-300 stroke-[1.5] mb-2" />
              <h3 className="font-semibold text-slate-600 text-sm">Participant directory is empty</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Add recipients manually or drop a CSV file containing Name, Email, and Event headers.
              </p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => setIsCsvOpen(true)} variant="outline" className="border-slate-200">
                  <Upload className="mr-2 h-4 w-4" /> Import CSV
                </Button>
                <Button onClick={() => setIsAddOpen(true)} className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">
                  Add Participant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOGS */}

      {/* Add Recipient dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Add Manual Recipient</DialogTitle>
            <DialogDescription>Create single participant details for certificate overlays.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Recipient Name</Label>
              <Input id="add-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email Address</Label>
              <Input id="add-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john@example.com" className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-event">Event Name</Label>
              <Input id="add-event" value={event} onChange={e => setEvent(e.target.value)} placeholder="e.g. AI Hackathon 2026" className="border-slate-200" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-slate-200">Cancel</Button>
              <Button type="submit" className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">Add Participant</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Recipient dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Edit Recipient Details</DialogTitle>
            <DialogDescription>Update parameters for overlays and SMTP transmission.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Recipient Name</Label>
              <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input id="edit-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-event">Event Name</Label>
              <Input id="edit-event" value={event} onChange={e => setEvent(e.target.value)} placeholder="Event" className="border-slate-200" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-slate-200">Cancel</Button>
              <Button type="submit" className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV dialog */}
      <Dialog open={isCsvOpen} onOpenChange={setIsCsvOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Import CSV Worksheet</DialogTitle>
            <DialogDescription>Bulk load participant details from spreadsheet files.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Format info */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 space-y-1">
              <span className="font-bold text-[#0A2540] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Expected Headers
              </span>
              <p>Your CSV file should contain columns named exactly:</p>
              <p className="font-mono text-[#0A2540] bg-slate-200/50 p-1 rounded inline-block mt-1">
                Name, Email, Event
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Select CSV File</Label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Plus className="h-6 w-6 text-slate-400 mb-1" />
                    <p className="text-xs text-slate-500 font-medium">Select .csv worksheet file</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleCsvFileChange}
                  />
                </label>
              </div>
              {csvContent && (
                <p className="text-xs text-[#20B2AA] font-semibold mt-1">✓ File loaded and ready for ingestion.</p>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsCsvOpen(false); setCsvContent(""); }} className="border-slate-200">Cancel</Button>
              <Button 
                onClick={handleCsvSubmit} 
                disabled={!csvContent || importCSVMutation.isPending}
                className="bg-[#20B2AA] hover:bg-[#1a948e] text-white"
              >
                {importCSVMutation.isPending ? "Ingesting..." : "Import Recipient List"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
