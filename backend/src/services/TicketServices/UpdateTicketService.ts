import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  userId?: number; // ID do usuário que está fazendo a ação
  isAdmin?: boolean; // Se o usuário é admin
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  userId: requestUserId,
  isAdmin = false
}: Request): Promise<Response> => {
  const { status, userId, queueId, whatsappId } = ticketData;

  const ticket = await ShowTicketService(ticketId);
  
  // VERIFICAÇÃO DE SEGURANÇA: Apenas admin ou dono do ticket pode modificar
  if (!isAdmin && ticket.userId !== requestUserId && ticket.status !== "pending") {
    throw new Error("Você não tem permissão para modificar este ticket");
  }
  if (ticket.status === "open") {
    await SetTicketMessagesAsRead(ticket);
  }

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  await ticket.update({
    status,
    queueId,
    userId
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  await ticket.reload();

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
