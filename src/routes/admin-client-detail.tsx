import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export const Route = createFileRoute('/admin-client-detail')({
  component: AdminClientDetail,
})

function AdminClientDetail() {
  // نفس كود كشف الحساب اللي سويناه
}
