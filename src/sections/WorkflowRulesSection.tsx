import React from "react";
import WorkflowRules from "@/components/WorkflowRules";
import { supabase } from "@/integrations/supabase/client";

export default function WorkflowRulesSection() {
  return <WorkflowRules />;
}
