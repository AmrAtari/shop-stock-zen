import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Factory, GitPullRequest, Building, Shield, Briefcase, Wrench } from "lucide-react";

// Sections
import OrganizationalStructureSection from "../sections/OrganizationalStructureSection";
import WorkflowRulesSection from "../sections/WorkflowRulesSection";
import SystemDefaultsSection from "../sections/SystemDefaultsSection";
import UserRolesSection from "../sections/UserRolesSection";
import StockAttributesSection from "../sections/StockAttributesSection";
import DirectDBAccessSection from "../sections/DirectDBAccessSection";

export default function Configuration() {
  const isAdmin = true; // Replace with your auth logic

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>

      <Tabs defaultValue="organizational-structure">
        <TabsList className="grid w-full grid-cols-6 h-full">
          <TabsTrigger value="organizational-structure" className="h-full">
            <Factory className="w-4 h-4 mr-2" /> Org Structure
          </TabsTrigger>
          <TabsTrigger value="workflow" className="h-full">
            <GitPullRequest className="w-4 h-4 mr-2" /> Workflow Rules
          </TabsTrigger>
          <TabsTrigger value="general" className="h-full">
            <Building className="w-4 h-4 mr-2" /> System Defaults
          </TabsTrigger>
          <TabsTrigger value="user-roles" className="h-full">
            <Shield className="w-4 h-4 mr-2" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="attributes" className="h-full">
            <Briefcase className="w-4 h-4 mr-2" /> Stock Attributes
          </TabsTrigger>
          <TabsTrigger value="db-access" disabled={!isAdmin}>
            <Wrench className="w-4 h-4 mr-2" /> DB Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizational-structure">
          <OrganizationalStructureSection />
        </TabsContent>
        <TabsContent value="workflow">
          <WorkflowRulesSection />
        </TabsContent>
        <TabsContent value="general">
          <SystemDefaultsSection />
        </TabsContent>
        <TabsContent value="user-roles">
          <UserRolesSection isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="attributes">
          <StockAttributesSection />
        </TabsContent>
        <TabsContent value="db-access">
          <DirectDBAccessSection isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
