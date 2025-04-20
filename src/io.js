let conversations = [];
let questionaries = [];
const userIps = [];
let bots = [];

const axios = require("axios");
const openaiService = require("./services/openai.service");
const openai = require("./config/openai.config");
const chatInteractor = require("./interactors/chat.interactor");
const messageInteractor = require("./interactors/message.interactor");
const questionaryInteractor = require("./interactors/questionary.interactor");
const userQuestionaryInteractor = require("./interactors/userQuestionary.interactor");
const leadsInteractor = require("./interactors/leads.interactor");
const clinicRepository = require("./repositories/clinic.repository");
const { enqueueCallback } = require("./utils/processQueue");

const { cloneObject } = require("./utils/functions");
const { clinicsLogs, generalLogs, questionaryLogs } = require("./utils/logs");
const languages = require("./utils/languages");
const locationList = require("./utils/locationList");
const clinicList = require("./utils/clinicList");
const calculateClinics = require("./utils/calculateClinics");
const e = require("cors");

const pendingBotStateRequests = new Map();

// (async () => {
//   const firstResponse = await openaiService.generateMessage(
//     openai,
//     'gpt-4o',
//     0.3,
//     [{role: 'system', content: 'Hola, ¿cómo estás?'}]
//   );
//   console.log('firstResponse', firstResponse);
//   console.log('firstResponse', firstResponse?.data?.choices[0].message["content"]);
// })()

// ********* questionary cleanup process *********

let cleanupIntervalQuestionaries;

const updateQuestionaryActivity = async (questionaryIndex) => {
  const questionary = questionaries[questionaryIndex];
  if (questionary) {

    if (!cleanupIntervalQuestionaries) {
      startCleanupQuestionariesProcess();
    }

    questionary.lastActivity = Date.now();
    return true;
  }
  return false;
};

const startCleanupQuestionariesProcess = () => {
  // Verificar cada 1 hora (puedes ajustar según necesidades)
  cleanupIntervalQuestionaries = setInterval(cleanupInactiveQuestionaries, 60 * 60 * 1000); // 1 hora
}

const cleanupInactiveQuestionaries = () => {
  const currentTime = Date.now();
  const fourHoursInMs = 4 * 60 * 60 * 1000;
  
  // Filtrar los cuestionarios inactivos por más de 4 horas
  const activeQuestionaries = questionaries.filter(questionary => {
    const isActive = (currentTime - questionary.lastActivity) < fourHoursInMs;
    
    if (!isActive) {
      console.log(`Eliminando cuestionario inactivo de la memoria: ${questionary.userId}`);
      // Aquí puedes agregar código para respaldo o notificación si necesitas
    }
    
    return isActive;
  });
  
  // Actualizar la lista de cuestionarios
  questionaries = activeQuestionaries;
  
  // Si no quedan cuestionarios, detener el proceso de limpieza
  if (questionaries.length === 0) {
    clearInterval(cleanupIntervalQuestionaries);
    cleanupIntervalQuestionaries = null;
  }
}

// ********* conversations cleanup process *********

let cleanupIntervalConversations;

const updateConversationsActivity = async (conversationIndex) => {
  const conversation = conversations[conversationIndex];
  if (conversation) {

    if (!cleanupIntervalConversations) {
      startCleanupConversationsProcess();
    }

    conversation.lastActivity = Date.now();
    return true;
  }
  return false;
};

const startCleanupConversationsProcess = () => {
  // Verificar cada 6 horas (puedes ajustar según necesidades)

  cleanupIntervalConversations = setInterval(cleanupInactiveConversations, 6 * 60 * 60 * 1000); // 6 horas
}

const cleanupInactiveConversations = () => {
  const currentTime = Date.now();
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000; // 24 horas
  
  // Filtrar los conversaciones inactivas por más de 24 horas
  const activeConversations = conversations.filter(conversation => {
    const isActive = (currentTime - conversation.lastActivity) < twentyFourHoursInMs;
    
    if (!isActive) {
      console.log(`Eliminando conversación inactiva de la memoria: ${conversation.userId}`);
    }
    
    return isActive;
  });
  
  // Actualizar la lista de conversaciones
  conversations = activeConversations;
  
  // Si no quedan conversaciones, detener el proceso de limpieza
  if (conversations.length === 0) {
    clearInterval(cleanupIntervalConversations);
    cleanupIntervalConversations = null;
  }
}

// ************************************************

const setBots = (botsToSet) => {
  bots = botsToSet;
};

const addBot = (bot) => {
  bots.push(bot);
};

const updateBot = (bot) => {
  console.log("Updating bot: " + bot);
  bots = [
    ...bots.filter((b) => b._id?.toString() !== bot._id?.toString()),
    bot,
  ];
};

const removeBot = (botId) => {
  bots = bots.filter((b) => b._id?.toString() !== botId?.toString());
};

const initializeIO = async (io) => {
  io.on("connection", async (socket) => {

    const { type, token } = socket.handshake.auth;

    if (type !== "whatsapp-bots-backend") {
      generalLogs("New client connected", socket.id, undefined);
      const clientIP =
      socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
      generalLogs(
        `Client connected from IP: ${clientIP}`,
        socket.id,
        undefined,
        clientIP
      );
    }


  // *********** whatsapp bots events **********

    socket.on("whatsapp bot config", async (botId) => {

      async function activarConexionSecundario(userId, botId) {
        try {
          const data = await axios.post(process.env.WHATSAPP_BOTS_API_URL + "/activar-websocket", { userId, botId });
          socket?.emit("response whatsapp bot state", data.data);

          console.log("🟢 Petición enviada al secundario para iniciar WebSocket");
          pendingBotStateRequests.set(userId, {
            botId,
            socket
          });
        } catch (error) {
          console.error("❌ Error al activar conexión del secundario:", error.message);
        }
      }

      activarConexionSecundario(socket.id, botId);
    });

    socket.on("whatsapp bot state", async (data) => {
      console.log("whatsapp bot state: ", data.userId, data);
      const { userId } = data;
      const pendingRequest = pendingBotStateRequests.get(userId);

      const socketToEmit = io.sockets.sockets.get(userId);
      console.log("socketToEmit", socketToEmit?.id);
      socketToEmit?.emit("response whatsapp bot state", data);
      // pendingRequest.socket.emit("response whatsapp bot state", data);
    });


  // *******************************************

    // ********* questionary events *********

    socket.on(
      "questionary",
      async (phoneNumber, questionaryId, generatedChatId) => {
        // const questionary = await questionaryInteractor.getUserQuestionaryById(questionaryId);
        // if (!questionary) return socket.emit("questionary not founded", questionaryId);
        // const phoneNumberValidated =
        //   phoneNumber?.length && phoneNumber !== "josebaTesting"
        //     ? await userQuestionaryInteractor.validateUserQuestionaryWithPhoneNumber(
        //         phoneNumber
        //       )
        //     : true;

        // const invalidIp =
        //   phoneNumber !== "josebaTesting" &&
        //   userIps.find(
        //     (userIp) =>
        //       userIp.ip === clientIP && userIp.expirationDate > new Date()
        //   );

        // if (!phoneNumberValidated || invalidIp) {
        //   if (!phoneNumberValidated)
        //     questionaryLogs(
        //       "phone number already used",
        //       socket.id,
        //       phoneNumber,
        //       clientIP
        //     );
        //   if (invalidIp)
        //     questionaryLogs(
        //       "ip already used today",
        //       socket.id,
        //       phoneNumber,
        //       clientIP
        //     );
        //   return socket.emit("phone number already used", phoneNumber);
        // }

        const questionaryIndex = questionaries.findIndex(
          (q) => q?.userId === generatedChatId
        );

        if (questionaryIndex === -1) {
          const newQuestionary = {
            userId: generatedChatId,
            phoneNumber: phoneNumber || "",
            questions: [],
            questionary: questionaryId,
            type: "questionary",
          };
          questionaries.push(newQuestionary);
          updateQuestionaryActivity(questionaryIndex);

          enqueueCallback(
            `Crear nuevo cuestionario (${generatedChatId})`,
            async () => {
              const questionaryCreated =
                await userQuestionaryInteractor.createUserQuestionary(
                  newQuestionary
                );
              await chatInteractor.createChat(
                {
                  chatId: generatedChatId,
                  firstName: "User[web]",
                  model:
                    questionaryCreated?.questionary?.bot?.model ||
                    "Clinics questionary",
                  botName:
                    questionaryCreated?.questionary?.bot?.name ||
                    "Clinics questionary",
                },
                generatedChatId,
                undefined,
                undefined
              );
            }
          );
        }

        questionaryLogs(
          questionaryIndex === -1
            ? "Questionary started"
            : "Continuing questionary",
          generatedChatId,
          phoneNumber,
          clientIP
        );

        socket.emit("server socket id", generatedChatId);
      }
    );

    socket.on(
      "questionary response",
      (questionaryResponse, generatedSocketId) => {
        const questionaryIndex = questionaries.findIndex(
          (q) => q.userId === generatedSocketId
        );

        if (questionaryResponse.type === "contact") {
          questionaryLogs(
            `Contact information received: ${questionaryResponse.name} - ${questionaryResponse.phone}`,
            generatedSocketId,
            `${questionaryResponse.name} - ${questionaryResponse.phone}`,
            ""
          );
          if (questionaryIndex !== -1) {
            questionaries[questionaryIndex].name = questionaryResponse.name;
            questionaries[questionaryIndex].phoneNumber =
              questionaryResponse.phone;

            const questionaryData = JSON.parse(
              JSON.stringify(questionaries[questionaryIndex])
            );

            updateQuestionaryActivity(questionaryIndex);

            enqueueCallback(
              `Actualizar cuestionario (${generatedSocketId})`,
              async () => {
                await userQuestionaryInteractor.updateUserQuestionary(
                  generatedSocketId,
                  questionaryData
                );

                const lead = await leadsInteractor.findByPhoneAndName({
                  name: questionaryData.name,
                  phone: questionaryData.phoneNumber,
                })
                
                if (lead) await userQuestionaryInteractor.updateUserQuestionary(
                  generatedSocketId,
                  { ...questionaryData, bchData: lead }
                );
              }
            );
          }
          return;
        }

        questionaryLogs(
          `${questionaryResponse?.backupQuestion?.label}: ${
            questionaryResponse.optionValue ||
            `${
              questionaryResponse.backupQuestion.options.find(
                (o) => o.key === questionaryResponse.optionKey
              ).label.length
                ? questionaryResponse.backupQuestion.options.find(
                    (o) => o.key === questionaryResponse.optionKey
                  ).label
                : questionaryResponse.backupQuestion.options.find(
                    (o) => o.key === questionaryResponse.optionKey
                  ).key
            }`
          }`,
          generatedSocketId,
          questionaries?.[questionaryIndex]?.phoneNumber,
          clientIP
        );
        socket.emit(
          "questionary response received",
          "questionary response received"
        );
        if (questionaryIndex !== -1) {
          const questionaryQuestionIndex = questionaries[
            questionaryIndex
          ].questions.findIndex(
            (q) => q.question === questionaryResponse.question
          );
          if (questionaryQuestionIndex !== -1) {
            questionaries[questionaryIndex].questions[
              questionaryQuestionIndex
            ] = questionaryResponse;
          } else {
            questionaries[questionaryIndex].questions.push(questionaryResponse);
          }
          const questionaryData = JSON.parse(
            JSON.stringify(questionaries[questionaryIndex])
          );

          updateQuestionaryActivity(questionaryIndex);
          enqueueCallback(
            `Actualizar cuestionario (${generatedSocketId})`,
            async () => {
              await userQuestionaryInteractor.updateUserQuestionary(
                generatedSocketId,
                questionaryData
              );
            }
          );
        }
      }
    );

    socket.on("questionary finished", async (language, generatedSocketId) => {
      questionaryLogs(
        "Questionary finished",
        generatedSocketId,
        undefined,
        clientIP
      );
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === generatedSocketId
      );
      if (questionaryIndex !== -1) {
        questionaryLogs(
          `Questionary finished and saving:`,
          generatedSocketId,
          questionaries[questionaryIndex]?.phoneNumber,
          clientIP,
          questionaries[questionaryIndex]
        );
        questionaries[questionaryIndex].languageLocale = language || "es";
        userIps.push({
          ip: clientIP,
          expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });
        console.log("UPDATING USER QUESTIONARY");
        const questionaryData = JSON.parse(
          JSON.stringify(questionaries[questionaryIndex])
        );
        enqueueCallback(
          `Actualizar cuestionario (${generatedSocketId})`,
          async () => {
            const userQuestionaryUpdated =
              await userQuestionaryInteractor.updateUserQuestionary(
                generatedSocketId,
                questionaryData
              );
            socket.emit(
              "questionary saved",
              // "Clinics questionary"
              userQuestionaryUpdated?.questionary?.bot?.name ||
                "Clinics questionary"
            );
          }
        );
        // const questionaryCreated =
        //   await userQuestionaryInteractor.createUserQuestionary(
        //     questionaries[questionaryIndex]
        //   );
        // if (!questionaryCreated) {
        //   questionaryLogs(
        //     `Questionary not saved: ${questionaries[questionaryIndex]}`,
        //     generatedSocketId,
        //     phoneNumber,
        //     clientIP
        //   );
        //   return socket.emit("questionary not saved", generatedSocketId);
        // }
        questionaries.splice(questionaryIndex, 1);
      }
    });

    // ********* static questionary events *********

    socket.on(
      "static questionary",
      async (
        phoneNumber,
        questionaryId,
        isTrivelliniQuestionary,
        generatedChatId
      ) => {
        // const questionary = await questionaryInteractor.getUserQuestionaryById(questionaryId);
        // if (!questionary) return socket.emit("questionary not founded", questionaryId);
        // const phoneNumberValidated = phoneNumber?.length
        //   ? await userQuestionaryInteractor.validateUserQuestionaryWithPhoneNumber(
        //       phoneNumber
        //     )
        //   : true;

        // const invalidIp = userIps.find(
        //   (userIp) => userIp.ip === clientIP && userIp.expirationDate > new Date()
        // );

        // if (!phoneNumberValidated || invalidIp) {
        //   if (!phoneNumberValidated)
        //     questionaryLogs(
        //       "phone number already used",
        //       socket.id,
        //       phoneNumber,
        //       clientIP
        //     );
        //   if (invalidIp)
        //     questionaryLogs(
        //       "ip already used today",
        //       socket.id,
        //       phoneNumber,
        //       clientIP
        //     );
        //   return socket.emit("phone number already used", phoneNumber);
        // }

        const questionaryIndex = questionaries.findIndex(
          (q) => q.userId === generatedChatId
        );

        if (questionaryIndex === -1) {
          const newQuestionary = {
            userId: generatedChatId,
            phoneNumber: phoneNumber || "",
            questions: [],
            questionary: questionaryId,
            type: !isTrivelliniQuestionary
              ? "static questionary"
              : "Trivellini questionary",
          };
          questionaries.push(newQuestionary);
          updateQuestionaryActivity(questionaryIndex);
          enqueueCallback(
            `Crear nuevo cuestionario (${generatedChatId})`,
            async () => {
              await userQuestionaryInteractor.createUserQuestionary(
                newQuestionary
              );
              await chatInteractor.createChat(
                {
                  chatId: generatedChatId,
                  firstName: newQuestionary.phoneNumber || "Anonymous",
                  model: newQuestionary?.type || "static questionary",
                  botName: newQuestionary?.type || "static questionary",
                },
                generatedChatId
              );
            }
          );
        }

        questionaryLogs(
          questionaryIndex === -1
            ? "Questionary started"
            : "Continuing questionary",
          generatedChatId,
          phoneNumber
        );

        socket.emit("static questionary server socket id", generatedChatId);
      }
    );

    socket.on(
      "static questionary response",
      (questionaryResponse, generatedChatId) => {
        const questionaryIndex = questionaries.findIndex(
          (q) => q.userId === generatedChatId
        );

        if (questionaryResponse.type === "contact") {
          questionaryLogs(
            `Contact information received: ${questionaryResponse.name} - ${questionaryResponse.phone}`,
            generatedChatId,
            `${questionaryResponse.name} - ${questionaryResponse.phone}`,
            ""
          );
          if (questionaryIndex !== -1) {
            questionaries[questionaryIndex].name = questionaryResponse.name;
            questionaries[questionaryIndex].phoneNumber =
              questionaryResponse.phone;

            const questionaryData = JSON.parse(
              JSON.stringify(questionaries[questionaryIndex])
            );
            updateQuestionaryActivity(questionaryIndex);
            enqueueCallback(
              `Actualizar cuestionario (${generatedChatId})`,
              async () => {
                await userQuestionaryInteractor.updateUserQuestionary(
                  generatedChatId,
                  questionaryData
                );

                const lead = await leadsInteractor.findByPhoneAndName({
                  name: questionaryData.name,
                  phone: questionaryData.phoneNumber,
                })
                
                if (lead) await userQuestionaryInteractor.updateUserQuestionary(
                  generatedChatId,
                  { ...questionaryData, bchData: lead }
                );
              }
            );
          }
          return;
        }

        questionaryLogs(
          `${questionaryResponse?.backupQuestion?.label}: ${
            questionaryResponse.optionValue ||
            `${
              questionaryResponse.backupQuestion.options.find(
                (o) => o.key === questionaryResponse.optionKey
              ).label.length
                ? questionaryResponse.backupQuestion.options.find(
                    (o) => o.key === questionaryResponse.optionKey
                  ).label
                : questionaryResponse.backupQuestion.options.find(
                    (o) => o.key === questionaryResponse.optionKey
                  ).key
            }`
          }`,
          generatedChatId,
          questionaries?.[questionaryIndex]?.phoneNumber,
          ""
        );

        socket.emit(
          "static questionary response received",
          "static questionary response received"
        );
        if (questionaryIndex !== -1) {
          const questionaryQuestionIndex = questionaries[
            questionaryIndex
          ].questions.findIndex(
            (q) => q.question === questionaryResponse.question
          );
          if (questionaryQuestionIndex !== -1) {
            questionaries[questionaryIndex].questions[
              questionaryQuestionIndex
            ] = questionaryResponse;
          } else {
            questionaries[questionaryIndex].questions.push(questionaryResponse);
          }
          questionaryData = JSON.parse(
            JSON.stringify(questionaries[questionaryIndex])
          );
          updateQuestionaryActivity(questionaryIndex);
          enqueueCallback(
            `Actualizar cuestionario (${generatedChatId})`,
            async () => {
              await userQuestionaryInteractor.updateUserQuestionary(
                generatedChatId,
                questionaryData
              );
            }
          );
        }
      }
    );

    socket.on(
      "static questionary finished",
      async (language, generatedChatId) => {
        questionaryLogs("Questionary finished", generatedChatId, undefined);
        const questionaryIndex = questionaries.findIndex(
          (q) => q.userId === generatedChatId
        );
        if (questionaryIndex !== -1) {
          questionaryLogs(
            `Questionary finished and saving:`,
            generatedChatId,
            questionaries[questionaryIndex]?.phoneNumber,
            "",
            questionaries[questionaryIndex]
          );
          questionaries[questionaryIndex].languageLocale = language || "es";
          const questionaryData = JSON.parse(
            JSON.stringify(questionaries[questionaryIndex])
          );
          enqueueCallback(
            `Actualizar cuestionario (${generatedChatId})`,
            async () => {
              await userQuestionaryInteractor.updateUserQuestionary(
                generatedChatId,
                questionaryData
              );
            }
          );

          // const questionaryCreated =
          //   await userQuestionaryInteractor.createUserQuestionary(
          //     questionaries[questionaryIndex]
          //   );
          // if (!questionaryCreated) {
          //   questionaryLogs(
          //     `Questionary not saved: ${questionaries[questionaryIndex]}`,
          //     generatedChatId,
          //     phoneNumber,
          //     ""
          //   );
          //   return socket.emit("static questionary not saved", generatedChatId);
          // }
          // chatInteractor.createChat(
          //   {
          //     chatId: generatedChatId,
          //     firstName:
          //       questionaries[questionaryIndex]?.phoneNumber || "Anonymous",
          //     model:
          //       questionaries[questionaryIndex].type || "static questionary",
          //     botName:
          //       questionaries[questionaryIndex].type || "static questionary",
          //   },
          //   generatedChatId
          // );
          questionaries.splice(questionaryIndex, 1);
          socket.emit("static questionary saved", generatedChatId);
        }
      }
    );

    // ********* bot events *********
    socket.on("bot", async (botName, formId) => {
      try {
        // const invalidIp = userIps.find(
        //   (userIp) =>
        //     userIp.ip === clientIP &&
        //     userIp.expirationDate > new Date() &&
        //     userIp.promptGenerated
        // );

        // if (invalidIp) {
        //   clinicsLogs("Ip already used today", socket.id, undefined, clientIP);
        //   return socket.emit("phone number already used", "");
        // }

        socket.emit("bot received", {
          body: "bot received",
        });

        const userQuestionary =
          await userQuestionaryInteractor.getUserQuestionary(formId);

        const chatBot = bots.find((b) => b.name === botName);

        if (!userQuestionary) {
          if (!chatBot) {
            socket.emit("bot not found", { botName: botName });
            return;
          }

          if (!userQuestionary || chatBot?.type !== "webform")
            throw new Error();
        }

        const userIpIndex = userIps.findIndex(
          (userIp) => userIp.ip === clientIP
        );
        // if (userIpIndex !== -1) userIps[userIpIndex].promptGenerated = true;

        // if (userQuestionary?.generatedPrompt) {
        //   if (userQuestionary?.firstResponsePrompt) {
        //     clinicsLogs(
        //       "Prompt already generated, showing first response of prompt",
        //       userQuestionary.userId,
        //       undefined,
        //       clientIP
        //     );
        //     const conversationIndex = conversations.findIndex(
        //       (c) => c.userId === userQuestionary.userId
        //     );
        //     if (conversationIndex === -1)
        //       conversations.push({
        //         userId: userQuestionary.userId,
        //         botName: userQuestionary.bot.name,
        //         lastMessages: [
        //           userQuestionary.generatedPrompt,
        //           userQuestionary.firstResponsePrompt,
        //         ],
        //       });
        //     return socket.emit("message", {
        //       body: userQuestionary?.firstResponsePrompt,
        //     });
        //   }
        //   clinicsLogs(
        //     "Prompt already generated, showing error message",
        //     socket.id,
        //     undefined,
        //     clientIP
        //   );

        //   return socket.emit("phone number already used", "");
        // }

        // ***** calculate clinics and save in chat ******
        // location: { lat: 40.4165, lon: -3.70256, pais: "España" }
        // criteria: { key: "a", label: "Calidad y servicio" }
        // distance: "a"

        if (formId && userQuestionary && userQuestionary?.calculatedClinics) {
          socket.emit("message", {
            body: userQuestionary?.calculatedClinics,
          });
        } else if (formId && userQuestionary) {
          try {
            let userAnswers = {};
            userQuestionary.questions.forEach((q) => {
              if (q.question.slug === "doctor_selection_criteria")
                userAnswers.criteria = {
                  key: q.optionKey,
                  label: q.question.options.find((o) => o.key === q.optionKey)
                    ?.label,
                };
              else if (q.question.slug === "how_far_would_you_travel")
                userAnswers.distance = q.optionKey;
              else if (q.question.slug === "residential_zone") {
                if (q.optionKey === "d") {
                  userAnswers.location = {
                    lat: 39.9334,
                    lon: 32.8597,
                    pais: "Turquía",
                  };
                } else {
                  const zone = locationList.zones.find(
                    (l) => l.key === q.optionKey
                  );
                  const location = zone.locations.find(
                    (l) => l.key === q.locationKey
                  );
                  userAnswers.location = {
                    lat: Number(location.coordinates.split(",")[0]),
                    lon: Number(location.coordinates.split(",")[1]),
                    pais: q.optionKey === "a" ? zone.name : location.name,
                  };
                }
              } else if (q.question.slug === "how_much_do_you_plan_to_invest") {
                userAnswers.price = {
                  desde: Number(q.optionValue.split(",")[0]),
                  hasta: Number(q.optionValue.split(",")[1]),
                };
              }
            });

            const { clinics } = await clinicRepository.getClinics({}, 1, 9999);
            let calculatedClinics = calculateClinics(
              userAnswers,
              clinics,
              userQuestionary.languageLocale?.toLowerCase() || "es"
            );
            clinicsLogs(
              `CalculatedClinics: ${calculatedClinics.response}`,
              formId,
              undefined,
              clientIP
            );
            conversations.push({
              userId: formId,
              botName: botName || userQuestionary?.questionary?.bot?.name,
              lastMessages: [JSON.stringify(calculatedClinics.response)],
            });
            updateConversationsActivity(conversations.length - 1);
            socket.emit("message", {
              body: JSON.stringify(calculatedClinics.response),
            });
            enqueueCallback(`Crear chat (${formId})`, async () => {
              const chat = await chatInteractor.getChatByChatId(formId);
              if (!chat) {
                await chatInteractor.createChat(
                  {
                    chatId: formId,
                    firstName: "User[web]",
                    model:
                      chatBot?.model ||
                      userQuestionary?.questionary?.bot?.model,
                    botName:
                      chatBot?.name || userQuestionary?.questionary?.bot?.name,
                  },
                  formId,
                  undefined,
                  undefined,
                  JSON.stringify(calculatedClinics.response),
                  calculatedClinics.logs
                );
              } else {
                await userQuestionaryInteractor.updateUserQuestionary(formId, {
                  calculatedClinics: JSON.stringify(calculatedClinics.response),
                  calculatedClinicsLogs: calculatedClinics.logs,
                });
              }
              await messageInteractor.createMessage({
                chatId: formId,
                botName: chatBot?.name || chat?.botName,
                data: "Initializing chat...",
                role: "system",
                promptToken: 0,
                tokens: 0,
                totalTokens: 0,
              });

              await messageInteractor.createMessage({
                chatId: formId,
                botName: chatBot?.name || chat?.botName,
                data: JSON.stringify(calculatedClinics.response),
                role: "assistant",
                promptToken: 0,
                tokens: 0,
                totalTokens: 0,
              });
            });
          } catch (err) {
            console.log(err);
            socket.emit("errorMessage", {
              body: "An error has occurred. Please try again later.",
            });

            enqueueCallback(`Crear chat (${formId})`, async () => {
              const chat = await chatInteractor.getChatByChatId(formId);
              if (!chat) {
                chatInteractor.createChat(
                  {
                    chatId: formId,
                    firstName: "User[web]",
                    model:
                      chatBot?.model || userQuestionary?.questionary?.bot?.name,
                    botName: chatBot?.name,
                  },
                  formId,
                  "",
                  ""
                );
              }
              await messageInteractor.createMessage({
                chatId: formId,
                botName: chatBot?.name || chat?.botName,
                data: "An error has occurred. Please try again later.",
                role: "assistant",
                promptToken: 0,
                tokens: 0,
                totalTokens: 0,
              });
            });
          }
        } else {
          socket.emit("errorMessage", {
            body: "An error has occurred. Please try again later.",
          });

          enqueueCallback(`Crear chat (${formId})`, async () => {
            chatInteractor.createChat(
              {
                chatId: formId,
                firstName: "User[web]",
                model: chatBot?.model,
                botName: chatBot?.name,
              },
              formId,
              "",
              ""
            );
            await messageInteractor.createMessage({
              chatId: formId,
              botName: chatBot?.name,
              data: "An error has occurred. Please try again later.",
              role: "assistant",
              promptToken: 0,
              tokens: 0,
              totalTokens: 0,
            });
          });
        }

        // ************************************************

        // const firstSystemAndAssistantMessage =
        //   await generateFirstSystemAndAssistantMessage(
        //     chatBot,
        //     formId,
        //     userQuestionary
        //   );
        // if (!firstSystemAndAssistantMessage) {
        //   socket.emit("message", {
        //     body: "An error has occurred. Please try again later.",
        //   });
        //   chatInteractor.createChat(
        //     {
        //       chatId: socket.id,
        //       firstName: "User[web]",
        //       model: chatBot.model,
        //       botName: chatBot.name,
        //     },
        //     formId,
        //     '',
        //     ''
        //   );
        //   await messageInteractor.createMessage({
        //     chatId: socket.id,
        //     botName: chatBot.name,
        //     data: "An error has occurred. Please try again later.",
        //     role: "assistant",
        //     promptToken: 0,
        //     tokens: 0,
        //     totalTokens: 0,
        //   });
        //   // throw new Error("Failed to generate message with openai service");
        // } else {
        //   const {
        //     firstSystemMessage,
        //     firstAssistantMessage,
        //     firstMessageTokens,
        //   } = firstSystemAndAssistantMessage;
        //   conversations.push({
        //     userId: socket.id,
        //     botName,
        //     lastMessages: [firstSystemMessage, firstAssistantMessage],
        //   });
        //   socket.emit("message", {
        //     body: firstAssistantMessage.content,
        //   });
        //   chatInteractor.createChat(
        //     {
        //       chatId: socket.id,
        //       firstName: "User[web]",
        //       model: chatBot.model,
        //       botName: chatBot.name,
        //     },
        //     formId,
        //     firstSystemMessage.content,
        //     firstAssistantMessage.content,
        //     undefined,
        //   );

        //   await messageInteractor.createMessage({
        //     chatId: socket.id,
        //     botName: chatBot.name,
        //     data: "Initializing chat...",
        //     role: "system",
        //     promptToken: firstMessageTokens.prompt_tokens,
        //     tokens: firstMessageTokens.prompt_tokens,
        //     totalTokens: firstMessageTokens.prompt_tokens,
        //   });

        //   await messageInteractor.createMessage({
        //     chatId: socket.id,
        //     botName: chatBot.name,
        //     data: firstAssistantMessage.content,
        //     role: "assistant",
        //     promptToken: firstMessageTokens.prompt_tokens,
        //     tokens: firstMessageTokens.completion_tokens,
        //     totalTokens: firstMessageTokens.total_tokens,
        //   });
        // }
      } catch (error) {
        console.error(error);
        socket.emit("errorMessage", {
          body: "An error has occurred. Please try again later.",
        });
      }
    });
    socket.on("external link", async (href, formId) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === (formId || socket.id)
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      // if (chatBot) {
      clinicsLogs(
        `External link clicked: ${href}`,
        formId || socket.id,
        undefined,
        clientIP
      );
      updateConversationsActivity(conversationIndex);
      enqueueCallback(
        `Crear mensaje de external link (${formId || socket.id})`,
        async () => {
          await messageInteractor.createMessage({
            chatId: formId || socket.id,
            botName: chatBot?.name,
            data: `El usuario hizo click al enlace que dirige a ${href}.`,
            role: "user",
          });
        }
      );
      // }
    });

    socket.on("get evaluation", async (clinicName, formId) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === (formId || socket.id)
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      updateConversationsActivity(conversationIndex);
      // if (chatBot) {
      clinicsLogs(
        `The user requested an evaluation for the clinic:  ${clinicName}`,
        formId || socket.id,
        undefined,
        clientIP
      );
      enqueueCallback(
        `Crear mensaje de external link (${formId || socket.id})`,
        async () => {
          await messageInteractor.createMessage({
            chatId: formId || socket.id,
            botName: chatBot?.name,
            data: `El usuario solicitó una valoración para la clínica ${clinicName}.`,
            role: "user",
          });
        }
      );
      // }
    });

    socket.on("clinics viewed", async (formId) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === (formId || socket.id)
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      if (chatBot) {
        updateConversationsActivity(conversationIndex);
        clinicsLogs(
          `The user is on the clinics page.`,
          formId || socket.id,
          undefined,
          clientIP
        );
        enqueueCallback(
          `Crear mensaje El usuario está en la página de clinicas (${
            formId || socket.id
          })`,
          async () => {
            const messageFounded = await messageInteractor.getMessage({
              chatId: formId || socket.id,
              botName: chatBot?.name,
              data: `El usuario está en la página de clinicas.`,
            });
            if (!messageFounded)
              await messageInteractor.createMessage({
                chatId: formId || socket.id,
                botName: chatBot?.name,
                data: `El usuario está en la página de clinicas.`,
                role: "user",
              });
          }
        );
      }
    });

    socket.on("message", async (content) => {
      try {
        socket.emit("message received", {
          body: "message received",
        });
        const conversationIndex = conversations.findIndex(
          (user) => user.userId === socket.id
        );
        conversations[conversationIndex].lastMessages.push({
          role: "user",
          content,
        });
        updateConversationsActivity(conversationIndex);
        const chatBot = bots.find(
          (b) => b.name == conversations[conversationIndex].botName
        );
        const openaiResponse = await openaiService.generateMessage(
          openai,
          chatBot.model,
          chatBot.temperature,
          conversations[conversationIndex].lastMessages
        );
        if (!openaiResponse)
          throw new Error("Failed to generate message with openai service");
        const openaiReply = openaiResponse.data.choices[0].message["content"];
        conversations[conversationIndex].lastMessages.push({
          role: "assistant",
          content: openaiReply,
        });
        socket.emit("message", {
          body: openaiReply,
        });
        enqueueCallback(
          `Crear mensaje (${content} - ${openaiReply})`,
          async () => {
            await messageInteractor.createMessage({
              chatId: socket.id,
              botName: chatBot.name,
              data: content,
              role: "user",
            });

            await messageInteractor.createMessage({
              chatId: socket.id,
              botName: chatBot.name,
              role: "assistant",
              data: openaiReply,
              promptToken: openaiResponse.data.usage.prompt_tokens,
              tokens: openaiResponse.data.usage.completion_tokens,
              totalTokens: openaiResponse.data.usage.total_tokens,
            });
          }
        );

        if (
          conversations[conversationIndex].lastMessages.length >
          (chatBot.maxMessageCount || 20)
        ) {
          conversations[conversationIndex].lastMessages.slice(1, 1);
        }
      } catch (e) {
        console.log(e);
        socket.emit("errorMessage", {
          body: "An error has occurred. Please try again later.",
        });
      }
    });

    socket.on("disconnect", () => {
      const userDisconnected = pendingBotStateRequests.get(socket.id);
      if (userDisconnected) {
        userDisconnected?.socket?.emit("whatsapp bot client disconnect", socket.id);
        pendingBotStateRequests.delete(socket.id);
      }
    //   generalLogs("Client disconnected", socket.id, undefined, clientIP);

    //   const questionaryIndex = questionaries.findIndex(
    //     (q) => q.userId === socket.id
    //   );
    //   if (questionaryIndex !== -1) {
    //     userQuestionaryInteractor.createUserQuestionaryAndChat(
    //       questionaries[questionaryIndex],
    //       questionaries[questionaryIndex].type || "static questionary"
    //     );

    //     // userIps.push({
    //     //   ip: clientIP,
    //     //   expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    //     // });

    //     questionaries.splice(questionaryIndex, 1);
    //   }

    //   const conversationIndex = conversations.findIndex(
    //     (user) => user.userId === socket.id
    //   );

    //   if (conversationIndex !== -1) {
    //     const chatBot = bots.find(
    //       (b) => b.name == conversations[conversationIndex]?.botName
    //     );

    //     messageInteractor.createMessage({
    //       chatId: socket.id,
    //       botName: chatBot.name,
    //       data: `El usuario se ha desconectado.`,
    //       role: "user",
    //     });

    //     return conversations.splice(conversationIndex, 1);
    //   }
    });
  });
};


const generateFirstSystemAndAssistantMessage = async (
  bot,
  userId,
  userQuestionary
) => {
  try {
    const botCloned = cloneObject(bot);
    if (userId && userQuestionary) {
      userQuestionary.questions.forEach((q) => {
        const optionLabel = q.question.options.find(
          (o) => o.key === q.optionKey
        )?.label;
        botCloned.prompt = botCloned.prompt.replace(
          q.question.slug,
          q.question.slug === "residential_zone"
            ? `${q.optionValue ? q.optionValue + ", " : ""}${optionLabel}`
            : q.optionValue || optionLabel
        );
      });

      botCloned.prompt += ` Todo esto en el idioma ${
        languages[userQuestionary.languageLocale || "es"]
      }.`;
      clinicsLogs(
        `Prompt generated with questionary answers: ${botCloned.prompt}`,
        userId
      );
    }

    const firstSystemMessage = {
      role: "system",
      content: botCloned.prompt,
    };
    const firstResponse = await openaiService.generateMessage(
      openai,
      bot.model,
      bot.temperature,
      [firstSystemMessage]
    );
    if (!firstResponse)
      throw new Error("Failed to generate message with openai service");
    const reply = firstResponse.data.choices[0].message["content"];
    const firstAssistantMessage = { role: "assistant", content: reply };
    if (userId && bot.type === "webform")
      clinicsLogs(
        `Response generated with questionary answers: ${reply}`,
        userId
      );

    return {
      firstSystemMessage,
      firstAssistantMessage,
      firstMessageTokens: firstResponse.data.usage,
    };
  } catch (error) {
    return null;
  }
};


module.exports = { initializeIO, setBots, addBot, updateBot, removeBot };
