import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  Mail, 
  Save, 
  HelpCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Server
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const utils = trpc.useUtils();

  // Queries
  const { data: smtp, isLoading: smtpLoading } = trpc.sender.getSmtp.useQuery();
  const { data: emailTemp, isLoading: templateLoading } = trpc.sender.getEmailTemplate.useQuery();

  // Mutations
  const saveSmtpMutation = trpc.sender.saveSmtp.useMutation();
  const testSmtpMutation = trpc.sender.testSmtp.useMutation();
  const saveTemplateMutation = trpc.sender.saveEmailTemplate.useMutation();

  // SMTP form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [useTls, setUseTls] = useState(true);

  // Email template form state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // SMTP test status state
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Synchronize query responses to form inputs
  useEffect(() => {
    if (smtp) {
      setHost(smtp.host);
      setPort(smtp.port);
      setEmail(smtp.email);
      setPassword(smtp.password);
      setFromName(smtp.fromName);
      setUseTls(smtp.useTls);
    }
  }, [smtp]);

  useEffect(() => {
    if (emailTemp) {
      setSubject(emailTemp.subject);
      setBody(emailTemp.body);
    } else {
      // Set reasonable defaults
      setSubject("Congratulations! Your Certificate is Ready");
      setBody("Dear {{name}},\n\nThank you for participating in {{event}}! We are thrilled to share your certificate of completion.\n\nPlease find your personalized PDF certificate attached to this email.\n\nBest regards,\nOrganizing Team");
    }
  }, [emailTemp]);

  // SMTP save submit
  const handleSmtpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host || !port || !email || !password || !fromName) {
      toast.error("Please fill in all SMTP fields");
      return;
    }

    try {
      await saveSmtpMutation.mutateAsync({
        host,
        port,
        email,
        password,
        fromName,
        useTls,
      });
      toast.success("SMTP configurations updated successfully!");
      utils.sender.getSmtp.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SMTP settings");
    }
  };

  // Test SMTP link
  const handleSmtpTest = async () => {
    if (!host || !port || !email || !password) {
      toast.error("Please fill in host, port, email, and password to test connection");
      return;
    }

    setTestResult(null);
    try {
      const res = await testSmtpMutation.mutateAsync({
        host,
        port,
        email,
        password,
        fromName: fromName || "Test Sender",
        useTls,
      });
      setTestResult(res);
      if (res.success) {
        toast.success("SMTP connection established successfully!");
      } else {
        toast.error("SMTP verification failed: check your credentials.");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error("SMTP connection test error: " + err.message);
    }
  };

  // Email template save
  const handleTemplateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) {
      toast.error("Subject and body cannot be empty");
      return;
    }

    try {
      await saveTemplateMutation.mutateAsync({ subject, body });
      toast.success("Email template subject and body saved!");
      utils.sender.getEmailTemplate.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save email template");
    }
  };

  const isLoading = smtpLoading || templateLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-10 w-10 text-[#20B2AA] animate-spin mb-4" />
        <p className="text-sm">Loading sender configuration settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0A2540]">Settings</h1>
        <p className="text-slate-500 mt-1">Configure SMTP connection details and customize recipient email templates.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SMTP Configuration Card */}
        <Card className="border-0 shadow-sm bg-white flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base text-[#0A2540] flex items-center gap-1.5">
              <Server className="h-4 w-4 text-[#20B2AA]" /> SMTP Connection Node
            </CardTitle>
            <CardDescription>Setup SMTP parameters to enable document dispatches.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSmtpSave}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="smtp-host">SMTP Server Host</Label>
                  <Input 
                    id="smtp-host" 
                    placeholder="e.g. smtp.gmail.com" 
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
                <div className="col-span-1 space-y-1.5">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input 
                    id="smtp-port" 
                    type="number" 
                    placeholder="587"
                    value={port}
                    onChange={e => setPort(parseInt(e.target.value) || 0)}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-email">Username / Email Address</Label>
                <Input 
                  id="smtp-email" 
                  type="email" 
                  placeholder="e.g. sender@example.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-password">App Password / Secret</Label>
                <Input 
                  id="smtp-password" 
                  type="password" 
                  placeholder="••••••••••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-fromname">Default From Name</Label>
                <Input 
                  id="smtp-fromname" 
                  placeholder="e.g. AI Hackathon Committee" 
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              {/* TLS toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100 mt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-[#0A2540]">Enable Secure Connection (TLS)</Label>
                  <p className="text-[10px] text-slate-400">Toggle secure socket layers (Recommended for port 465/587)</p>
                </div>
                <Switch checked={useTls} onCheckedChange={setUseTls} />
              </div>

              {/* Instant Test Output Result */}
              {testResult && (
                <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs animate-in fade-in duration-300 ${
                  testResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {testResult.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Test Passed!</span>
                        <p className="text-emerald-700 mt-0.5">SMTP verification verified. Your server connection is ready.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Verification Failed</span>
                        <p className="font-mono text-[10px] text-rose-700 mt-1 whitespace-pre-wrap max-w-full overflow-auto">
                          {testResult.error || "Incorrect credentials or firewall timeout."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 border-t flex justify-between gap-2 bg-slate-50/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSmtpTest}
                disabled={testSmtpMutation.isPending}
                className="border-slate-200 text-[#0A2540]"
              >
                {testSmtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button 
                type="submit" 
                disabled={saveSmtpMutation.isPending}
                className="bg-[#20B2AA] hover:bg-[#1a948e] text-white"
              >
                {saveSmtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Connection
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Email Customization Card */}
        <Card className="border-0 shadow-sm bg-white flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base text-[#0A2540] flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-[#20B2AA]" /> Email Template Settings
            </CardTitle>
            <CardDescription>Customize subject line and message body dispatched to users.</CardDescription>
          </CardHeader>
          <form onSubmit={handleTemplateSave}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="template-subject">Email Subject Title</Label>
                <Input 
                  id="template-subject" 
                  placeholder="e.g. Congratulations, your certificate is ready!" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-body">Email HTML/Text Body</Label>
                <Textarea 
                  id="template-body" 
                  rows={8}
                  placeholder="Write message template..." 
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="border-slate-200 font-mono text-xs"
                />
              </div>

              {/* Template variables help badge */}
              <div className="p-3.5 bg-slate-50 border rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-[#0A2540] flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-[#20B2AA]" /> Dynamic Variable Keys
                </span>
                <p className="text-slate-500">Insert bracketed fields to replace them dynamically with participant details:</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="font-mono bg-slate-200/60 text-[#0A2540] px-2 py-0.5 rounded text-[10px]">
                    {"{{name}}"} - Participant Name
                  </span>
                  <span className="font-mono bg-slate-200/60 text-[#0A2540] px-2 py-0.5 rounded text-[10px]">
                    {"{{event}}"} - Registered Event Name
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 border-t flex justify-end bg-slate-50/50">
              <Button 
                type="submit" 
                disabled={saveTemplateMutation.isPending}
                className="bg-[#20B2AA] hover:bg-[#1a948e] text-white"
              >
                {saveTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Body Template
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
