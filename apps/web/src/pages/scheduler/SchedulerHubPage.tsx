import React, { useState } from 'react';
import { CalendarClock, Mail, Cpu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Tabs } from '../../components/ui/tabs';
import { SchedulersTab } from './tabs/SchedulersTab';
import { ScheduledEmailsTab } from './tabs/ScheduledEmailsTab';
import { QueuesTab } from './tabs/QueuesTab';

export const SchedulerHubPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const [activeTab, setActiveTab] = useState('schedulers');

  const orgId = activeOrg?.id;

  if (!orgId) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Please select an active organization to access the Email Scheduler Hub.
      </div>
    );
  }

  const tabItems = [
    {
      id: 'schedulers',
      label: 'Schedulers',
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    {
      id: 'emails',
      label: 'Scheduled Emails',
      icon: <Mail className="h-3.5 w-3.5" />,
    },
    {
      id: 'queues',
      label: 'Dynamic Queues',
      icon: <Cpu className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarClock className="h-5 w-5" />
            </div>
            Email Scheduler Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure reusable template pipelines, monitor asynchronous delayed email jobs, and manage BullMQ worker pools.
          </p>
        </div>

        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Panels */}
      {activeTab === 'schedulers' && <SchedulersTab orgId={orgId} />}
      {activeTab === 'emails' && <ScheduledEmailsTab orgId={orgId} />}
      {activeTab === 'queues' && <QueuesTab orgId={orgId} />}
    </div>
  );
};

export default SchedulerHubPage;
