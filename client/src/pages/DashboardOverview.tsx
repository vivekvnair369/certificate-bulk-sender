import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Mail, 
  Settings, 
  Plus
} from "lucide-react";
import { Link } from "wouter";

export default function DashboardOverview() {
  const { data: templates, isLoading: templatesLoading } = trpc.sender.listTemplates.useQuery();
  const { data: participants, isLoading: participantsLoading } = trpc.sender.listParticipants.useQuery();
  const { data: logs, isLoading: logsLoading } = trpc.sender.getLogs.useQuery();
  const { data: smtp } = trpc.sender.getSmtp.useQuery();

  const isConfigured = !!smtp;

  // Calculate statistics
  const totalTemplates = templates?.length || 0;
  const totalParticipants = participants?.length || 0;
  
  const sentCount = participants?.filter(p => p.sendStatus === "sent").length || 0;
  const failedCount = participants?.filter(p => p.sendStatus === "failed").length || 0;
  const pendingCount = participants?.filter(p => p.sendStatus === "pending").length || 0;

  const successRate = totalParticipants > 0 
    ? Math.round((sentCount / (sentCount + failedCount || 1)) * 100) 
    : 0;

  const isLoading = templatesLoading || participantsLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/4"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-xl"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A2540]">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor certificate templates, participant distribution, and SMTP delivery.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/templates">
            <Button className="bg-[#20B2AA] hover:bg-[#1a948e] text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Template
            </Button>
          </Link>
          <Link href="/participants">
            <Button variant="outline" className="border-slate-200 text-[#0A2540] hover:bg-slate-50">
              Manage Participants
            </Button>
          </Link>
        </div>
      </div>

      {/* SMTP Warning Banner */}
      {!isConfigured && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm animate-bounce">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">SMTP settings are missing.</span>
              <p className="text-sm text-amber-700 mt-0.5">
                You must configure your SMTP connection credentials before you can dispatch emails.
              </p>
            </div>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-[#0A2540] hover:bg-[#123659] text-white">
              Configure Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Certificate Templates</CardTitle>
            <div className="p-2 bg-slate-50 group-hover:bg-[#20B2AA]/10 rounded-lg transition-colors">
              <FileText className="h-4 w-4 text-[#0A2540] group-hover:text-[#20B2AA]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A2540]">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded certificate layouts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Participants</CardTitle>
            <div className="p-2 bg-slate-50 group-hover:bg-[#20B2AA]/10 rounded-lg transition-colors">
              <Users className="h-4 w-4 text-[#0A2540] group-hover:text-[#20B2AA]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#0A2540]">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} waiting in sending queue
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Sent Success</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{sentCount}</div>
            <p className="text-xs text-emerald-700/80 font-medium mt-1">
              {successRate}% delivery success rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Failed Delivery</CardTitle>
            <div className="p-2 bg-rose-50 rounded-lg">
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{failedCount}</div>
            <p className="text-xs text-rose-700/80 font-medium mt-1">
              Requires detail correction or retry
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Delivery Logs */}
        <Card className="border-0 shadow-sm bg-white md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[#0A2540]">Recent Mail Logs</CardTitle>
              <CardDescription>Latest email transmissions and errors</CardDescription>
            </div>
            <Link href="/participants">
              <Button variant="ghost" size="sm" className="text-[#20B2AA] hover:text-[#1a948e]">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-400 text-left">
                      <th className="pb-3 font-semibold">Recipient</th>
                      <th className="pb-3 font-semibold">Subject</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 5).map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-medium text-[#0A2540] truncate max-w-[150px]">
                          {log.recipientEmail}
                        </td>
                        <td className="py-3 text-slate-500 truncate max-w-[200px]">{log.subject}</td>
                        <td className="py-3">
                          {log.status === "sent" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="h-3 w-3" /> Sent
                            </span>
                          ) : log.status === "failed" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                              <XCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-slate-400">
                          {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Mail className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-sm">No email records found</p>
                <p className="text-xs mt-1 text-slate-400">Emails you send will be logged here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#0A2540]">Overview Progress</CardTitle>
            <CardDescription>Sending metrics visual scale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-[#0A2540]">Email Send Progress</span>
                <span className="text-[#20B2AA]">{successRate}% Completed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-[#20B2AA] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${successRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{sentCount} Delivered</span>
                <span>{totalParticipants} Total</span>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-4 bg-[#FDFBF7] rounded-xl border border-amber-100 text-sm space-y-2">
              <span className="font-semibold text-[#0A2540] flex items-center gap-1.5">
                💡 Workflow Checklist
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-xs">
                <li>Create template and position Name & Event fields.</li>
                <li>Write a compelling email template with subject.</li>
                <li>Import participant CSV and check columns.</li>
                <li>Make sure SMTP settings test passes.</li>
                <li>Run a single test send before sending in bulk.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
