"use client";

import { useAdminTickets } from "../hooks/useAdminTickets";
import type { TicketsViewModel } from "../types";
import { TicketsDesktop } from "./desktop/TicketsDesktop";
import { TicketsMobile } from "./mobile/TicketsMobile";

interface TicketsPageProps {
  initialView: TicketsViewModel;
}

export function TicketsPage({ initialView }: TicketsPageProps) {
  const tickets = useAdminTickets(initialView);

  return (
    <>
      <div className="hidden lg:block">
        <TicketsDesktop tickets={tickets} />
      </div>
      <div className="lg:hidden">
        <TicketsMobile tickets={tickets} />
      </div>
    </>
  );
}
