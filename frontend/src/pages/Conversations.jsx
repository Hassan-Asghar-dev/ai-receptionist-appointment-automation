import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Inbox,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  User,
  UserRound,
  XCircle,
  ShieldCheck,
  BotMessageSquare,
  Send,
  Lock,
} from "lucide-react";

import api from "../services/api";

function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedConversationId, setSelectedConversationId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
   const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [actionSaving, setActionSaving] = useState(false);
  const [replyText, setReplyText] = useState("");

  /* =========================================================
     LOAD PAGE DATA
  ========================================================= */

  const fetchConversations = useCallback(async (initial = true) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [
        conversationResponse,
        patientResponse,
        userResponse,
      ] = await Promise.all([
        api.get("/conversation-sessions/"),
        api.get("/patients/"),
        api.get("/auth/me"),
      ]);

      const conversationData = Array.isArray(
        conversationResponse.data
      )
        ? conversationResponse.data
        : [];

      const patientData = Array.isArray(patientResponse.data)
        ? patientResponse.data
        : [];

      setConversations(conversationData);
      setPatients(patientData);
      setCurrentUser(userResponse.data || null);

      setSelectedConversationId((currentId) => {
        if (
          currentId &&
          conversationData.some(
            (conversation) => conversation.id === currentId
          )
        ) {
          return currentId;
        }

        return conversationData[0]?.id ?? null;
      });
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Could not load conversations."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* =========================================================
     SELECTED CONVERSATION
  ========================================================= */

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id === selectedConversationId
      ) || null,
    [conversations, selectedConversationId]
  );

  /* =========================================================
     LOAD N8N WHATSAPP HISTORY
  ========================================================= */

  const fetchMessages = useCallback(
    async (conversationId, showLoader = true) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      try {
        if (showLoader) {
          setMessagesLoading(true);
        }

        setMessageError("");

        const response = await api.get(
          `/conversation-sessions/${conversationId}/whatsapp-history`
        );

        setMessages(
          Array.isArray(response.data?.messages)
            ? response.data.messages
            : []
        );
      } catch (err) {
        console.error(err);

        setMessageError(
          getErrorMessage(
            err,
            "Could not load WhatsApp conversation history."
          )
        );

        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    } else {
      setMessages([]);
    }

    setReplyText("");
  }, [selectedConversationId, fetchMessages]);

  useEffect(() => {
  if (!selectedConversationId) return;

  const interval = setInterval(() => {
    fetchMessages(selectedConversationId, false);
  }, 3000);

  return () => clearInterval(interval);
}, [selectedConversationId, fetchMessages]);

  /* =========================================================
     PATIENT LOOKUP
  ========================================================= */

  const patientMap = useMemo(
    () =>
      Object.fromEntries(
        patients.map((patient) => [patient.id, patient])
      ),
    [patients]
  );

  const getPatient = (patientId) => patientMap[patientId];

  const getPatientName = (patientId) =>
    getPatient(patientId)?.full_name ||
    getPatient(patientId)?.name ||
    `Patient #${patientId}`;

  /* =========================================================
     FILTERS
  ========================================================= */

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const patient = patientMap[conversation.patient_id];

      const patientName =
        patient?.full_name || patient?.name || "";

      const whatsappNumber =
        patient?.whatsapp_number ||
        conversation.whatsapp_number ||
        "";

      const matchesSearch =
        !query ||
        patientName.toLowerCase().includes(query) ||
        String(whatsappNumber)
          .toLowerCase()
          .includes(query) ||
        String(conversation.id).includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        conversation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    conversations,
    patientMap,
    search,
    statusFilter,
  ]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const aiActiveCount = conversations.filter(
    (conversation) => conversation.status === "AI_ACTIVE"
  ).length;

  const humanRequiredCount = conversations.filter(
    (conversation) => conversation.status === "HUMAN_REQUIRED"
  ).length;

  const humanActiveCount = conversations.filter(
    (conversation) => conversation.status === "HUMAN_ACTIVE"
  ).length;

  const closedCount = conversations.filter(
    (conversation) => conversation.status === "CLOSED"
  ).length;

  /* =========================================================
     UPDATE LOCAL CONVERSATION
  ========================================================= */

  const replaceConversation = (updatedConversation) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation
      )
    );
  };

  /* =========================================================
     TAKE OVER
  ========================================================= */

  const takeOverConversation = async () => {
    if (!selectedConversation || !currentUser?.user_id) {
      return;
    }

    try {
      setActionSaving(true);

      const response = await api.patch(
        `/conversation-sessions/${selectedConversation.id}`,
        {
          status: "HUMAN_ACTIVE",
          assigned_to_user_id: currentUser.user_id,
        }
      );

      replaceConversation(response.data);
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          "Could not take over this conversation."
        )
      );
    } finally {
      setActionSaving(false);
    }
  };

  /* =========================================================
     RETURN TO AI
  ========================================================= */

  const returnToAI = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Return this conversation to the AI assistant?"
    );

    if (!confirmed) return;

    try {
      setActionSaving(true);

      const response = await api.patch(
        `/conversation-sessions/${selectedConversation.id}`,
        {
          status: "AI_ACTIVE",
        }
      );

      replaceConversation(response.data);
      setReplyText("");
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          "Could not return this conversation to AI."
        )
      );
    } finally {
      setActionSaving(false);
    }
  };

  /* =========================================================
     CLOSE CONVERSATION
  ========================================================= */

  const closeConversation = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Close this conversation?"
    );

    if (!confirmed) return;

    try {
      setActionSaving(true);

      const response = await api.patch(
        `/conversation-sessions/${selectedConversation.id}`,
        {
          status: "CLOSED",
        }
      );

      replaceConversation(response.data);
      setReplyText("");
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          "Could not close this conversation."
        )
      );
    } finally {
      setActionSaving(false);
    }
  };

  /* =========================================================
     REOPEN WITH AI
  ========================================================= */

  const reopenWithAI = async () => {
    if (!selectedConversation) return;

    try {
      setActionSaving(true);

      const response = await api.patch(
        `/conversation-sessions/${selectedConversation.id}`,
        {
          status: "AI_ACTIVE",
        }
      );

      replaceConversation(response.data);
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          "Could not reopen this conversation."
        )
      );
    } finally {
      setActionSaving(false);
    }
  };

  /* =========================================================
     SEND REPLY

     Sends receptionist replies through the backend WhatsApp
     endpoint and refreshes the conversation history.
  ========================================================= */

  const handleSendReply = async () => {
    const message = replyText.trim();

    if (!message || !selectedConversation || sendingReply) return;

    try {
      setSendingReply(true);
      setMessageError("");

      await api.post(
        `/conversation-sessions/${selectedConversation.id}/reply`,
        {
          message,
        }
      );

      setReplyText("");

      // Refresh combined patient/AI/receptionist history immediately.
      await fetchMessages(selectedConversation.id, false);

      // Refresh conversation metadata/status without the full page loader.
      await fetchConversations(false);
    } catch (err) {
      console.error("Failed to send receptionist reply:", err);

      const errorMessage = getErrorMessage(
        err,
        "Unable to send WhatsApp message."
      );

      window.alert(errorMessage);
    } finally {
      setSendingReply(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw
            size={30}
            className="mx-auto animate-spin text-slate-400"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading conversations...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="p-8">
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-100 bg-white">
          <div className="max-w-md p-8 text-center">
            <AlertCircle
              size={38}
              className="mx-auto text-red-500"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Could not load conversations
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchConversations()}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Conversations
          </h1>

          <p className="mt-2 text-slate-500">
            Monitor patient WhatsApp conversations and AI
            handovers.
          </p>

          {currentUser && (
            <p className="mt-1 text-xs text-slate-400">
              Signed in as {currentUser.full_name} ·{" "}
              {formatRole(currentUser.role)}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={async () => {
            await fetchConversations(false);

            if (selectedConversationId) {
              await fetchMessages(
                selectedConversationId,
                false
              );
            }
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      {/* SUMMARY */}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total"
          value={conversations.length}
          icon={<Inbox size={20} />}
        />

        <SummaryCard
          title="AI Active"
          value={aiActiveCount}
          icon={<Bot size={20} />}
        />

        <SummaryCard
          title="Needs Human"
          value={humanRequiredCount}
          icon={<AlertCircle size={20} />}
        />

        <SummaryCard
          title="Human Active"
          value={humanActiveCount}
          icon={<UserRound size={20} />}
        />

        <SummaryCard
          title="Closed"
          value={closedCount}
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      {/* MAIN CHAT LAYOUT */}

      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
        {/* LEFT SIDE */}

        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All conversations</option>
              <option value="AI_ACTIVE">AI Active</option>
              <option value="HUMAN_REQUIRED">
                Human Required
              </option>
              <option value="HUMAN_ACTIVE">
                Human Active
              </option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="max-h-[570px] overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle
                  size={32}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No conversations found
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const selected =
                  conversation.id ===
                  selectedConversationId;

                const patient =
                  getPatient(conversation.patient_id);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      setSelectedConversationId(
                        conversation.id
                      )
                    }
                    className={`w-full border-b border-slate-100 p-4 text-left transition ${
                      selected
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">
                        {getInitials(
                          getPatientName(
                            conversation.patient_id
                          )
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900">
                            {getPatientName(
                              conversation.patient_id
                            )}
                          </p>

                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatConversationTime(
                              conversation.last_message_at ||
                                conversation.updated_at
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {patient?.whatsapp_number ||
                            conversation.whatsapp_number ||
                            "No WhatsApp number"}
                        </p>

                        <div className="mt-2">
                          <ConversationStatus
                            status={conversation.status}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}

        {!selectedConversation ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-center">
              <MessageCircle
                size={48}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-semibold text-slate-700">
                Select a conversation
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Choose a patient conversation to view messages.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            {/* CHAT HEADER */}

            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">
                    {getInitials(
                      getPatientName(
                        selectedConversation.patient_id
                      )
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">
                        {getPatientName(
                          selectedConversation.patient_id
                        )}
                      </h2>

                      <ConversationStatus
                        status={selectedConversation.status}
                      />
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={13} />

                      {getPatient(
                        selectedConversation.patient_id
                      )?.whatsapp_number ||
                        selectedConversation.whatsapp_number ||
                        "-"}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedConversation.status ===
                    "AI_ACTIVE" ||
                    selectedConversation.status ===
                      "HUMAN_REQUIRED") && (
                    <button
                      type="button"
                      disabled={
                        actionSaving ||
                        !currentUser?.user_id
                      }
                      onClick={takeOverConversation}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionSaving ? (
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <UserRound size={16} />
                      )}

                      Take Over
                    </button>
                  )}

                  {selectedConversation.status ===
                    "HUMAN_ACTIVE" && (
                    <button
                      type="button"
                      disabled={actionSaving}
                      onClick={returnToAI}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <BotMessageSquare size={16} />
                      Return to AI
                    </button>
                  )}

                  {selectedConversation.status !== "CLOSED" && (
                    <button
                      type="button"
                      disabled={actionSaving}
                      onClick={closeConversation}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Close
                    </button>
                  )}

                  {selectedConversation.status === "CLOSED" && (
                    <button
                      type="button"
                      disabled={actionSaving}
                      onClick={reopenWithAI}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Bot size={16} />
                      Reopen with AI
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CONVERSATION INFO */}

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              <span>
                Conversation #{selectedConversation.id}
              </span>

              <span>
                Intent:{" "}
                <strong className="text-slate-700">
                  {selectedConversation.current_intent ||
                    "Not detected"}
                </strong>
              </span>

              <span>
                Booking state:{" "}
                <strong className="text-slate-700">
                  {selectedConversation.booking_state ||
                    "None"}
                </strong>
              </span>

              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={13} />

                Assigned staff:{" "}
                <strong className="text-slate-700">
                  {getAssignedStaffName(
                    selectedConversation,
                    currentUser
                  )}
                </strong>
              </span>
            </div>

            {/* STATUS NOTICE */}

            <ConversationNotice
              conversation={selectedConversation}
              currentUser={currentUser}
            />

            {/* MESSAGES */}

            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5">
              {messagesLoading ? (
                <div className="flex h-full min-h-[350px] items-center justify-center">
                  <div className="text-center">
                    <RefreshCw
                      size={25}
                      className="mx-auto animate-spin text-slate-400"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Loading messages...
                    </p>
                  </div>
                </div>
              ) : messageError ? (
                <div className="flex min-h-[350px] items-center justify-center">
                  <div className="text-center">
                    <AlertCircle
                      size={30}
                      className="mx-auto text-red-500"
                    />

                    <p className="mt-3 text-sm text-red-600">
                      {messageError}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        fetchMessages(
                          selectedConversation.id
                        )
                      }
                      className="mt-4 text-sm font-semibold text-slate-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-[350px] items-center justify-center">
                  <div className="text-center">
                    <MessageCircle
                      size={38}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 font-semibold text-slate-600">
                      No WhatsApp history found
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      No n8n WhatsApp messages were found for
                      this patient.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={`${message.source || "message"}-${message.id}`}
                      message={message}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* RECEPTIONIST REPLY */}

            <div className="border-t border-slate-200 bg-white p-4">
              {selectedConversation.status ===
              "HUMAN_ACTIVE" ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Receptionist reply
                      </p>

                      <p className="text-xs text-slate-400">
                        You have control of this conversation.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      <UserRound size={13} />
                      Human mode
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(event) =>
                        setReplyText(event.target.value)
                      }
                      placeholder="Type a WhatsApp reply..."
                      className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      disabled={!replyText.trim() || sendingReply}
                      onClick={handleSendReply}
                      className="inline-flex h-[52px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingReply ? (
                        <>
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          Send
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 size={13} />
                    <span>
                      Replies are sent directly to the patient's WhatsApp.
                    </span>
                  </div>
                </div>
              ) : selectedConversation.status === "CLOSED" ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  <Lock size={16} />
                  This conversation is closed.
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="flex items-start gap-2">
                    <Bot
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        AI is handling this conversation
                      </p>

                      <p className="mt-0.5 text-xs text-emerald-700">
                        Take over the conversation to enable the
                        receptionist reply area.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      actionSaving ||
                      !currentUser?.user_id
                    }
                    onClick={takeOverConversation}
                    className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Take Over
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CONVERSATION NOTICE
========================================================= */

function ConversationNotice({
  conversation,
  currentUser,
}) {
  if (conversation.status === "HUMAN_REQUIRED") {
    return (
      <div className="border-b border-red-100 bg-red-50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
          <AlertCircle size={16} />
          AI has marked this conversation as requiring human
          assistance.
        </div>
      </div>
    );
  }

  if (conversation.status === "HUMAN_ACTIVE") {
    const assignedToCurrentUser =
      conversation.assigned_to_user_id ===
      currentUser?.user_id;

    return (
      <div className="border-b border-blue-100 bg-blue-50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
          <UserRound size={16} />

          {assignedToCurrentUser
            ? "You are currently handling this conversation."
            : conversation.assigned_to_user_id
            ? `This conversation is assigned to User #${conversation.assigned_to_user_id}.`
            : "A staff member is currently handling this conversation."}
        </div>
      </div>
    );
  }

  if (conversation.status === "CLOSED") {
    return (
      <div className="border-b border-slate-200 bg-slate-100 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <CheckCircle2 size={16} />
          This conversation has been closed.
        </div>
      </div>
    );
  }

  return null;
}

/* =========================================================
   MESSAGE BUBBLE
========================================================= */

function MessageBubble({ message }) {
  const patient = message.sender_type === "PATIENT";
  const system = message.sender_type === "SYSTEM";

  if (system) {
    return (
      <div className="flex justify-center">
        <div className="max-w-xl rounded-xl bg-slate-200 px-4 py-2 text-center text-xs text-slate-600">
          <p>{message.message_text}</p>

          {message.sent_at && (
            <p className="mt-1 text-[10px] text-slate-400">
              {formatDateTime(message.sent_at)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        patient ? "justify-start" : "justify-end"
      }`}
    >
      <div className="max-w-[80%]">
        <div
          className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${
            patient
              ? "justify-start text-slate-500"
              : "justify-end text-slate-500"
          }`}
        >
          {getSenderIcon(message.sender_type)}
          {formatSender(message.sender_type)}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            patient
              ? "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
              : message.sender_type === "AI"
              ? "rounded-tr-sm bg-emerald-600 text-white"
              : "rounded-tr-sm bg-slate-900 text-white"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.message_text}
          </p>
        </div>

        {message.sent_at && (
          <p
            className={`mt-1 text-[10px] text-slate-400 ${
              patient ? "text-left" : "text-right"
            }`}
          >
            {formatDateTime(message.sent_at)}
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function ConversationStatus({ status }) {
  const styles = {
    AI_ACTIVE: "bg-emerald-50 text-emerald-700",
    HUMAN_REQUIRED: "bg-red-50 text-red-700",
    HUMAN_ACTIVE: "bg-blue-50 text-blue-700",
    CLOSED: "bg-slate-100 text-slate-600",
  };

  const labels = {
    AI_ACTIVE: "AI Active",
    HUMAN_REQUIRED: "Needs Human",
    HUMAN_ACTIVE: "Human Active",
    CLOSED: "Closed",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getSenderIcon(senderType) {
  switch (senderType) {
    case "AI":
      return <Bot size={13} />;

    case "RECEPTIONIST":
      return <UserRound size={13} />;

    case "PATIENT":
      return <User size={13} />;

    default:
      return <MessageCircle size={13} />;
  }
}

function getInitials(name) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function formatSender(senderType) {
  const labels = {
    PATIENT: "Patient",
    AI: "AI Assistant",
    RECEPTIONIST: "Receptionist",
    SYSTEM: "System",
  };

  return labels[senderType] || senderType;
}

function formatRole(role) {
  const labels = {
    ADMIN: "Admin",
    RECEPTIONIST: "Receptionist",
  };

  return labels[role] || role || "Staff";
}

function getAssignedStaffName(conversation, currentUser) {
  if (!conversation.assigned_to_user_id) {
    return "Unassigned";
  }

  if (
    currentUser?.user_id ===
    conversation.assigned_to_user_id
  ) {
    return `${currentUser.full_name} (You)`;
  }

  return `User #${conversation.assigned_to_user_id}`;
}

function formatConversationTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

export default Conversations;