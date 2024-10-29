const conversations = [];
const questionaries = [];
const userIps = [];
let bots = [];

const openaiService = require("./services/openai.service");
const openai = require("./config/openai.config");
const chatInteractor = require("./interactors/chat.interactor");
const messageInteractor = require("./interactors/message.interactor");
const questionaryInteractor = require("./interactors/questionary.interactor");
const userQuestionaryInteractor = require("./interactors/userQuestionary.interactor");
const clinicRepository = require("./repositories/clinic.repository");

const { cloneObject } = require("./utils/functions");
const { clinicsLogs, generalLogs, questionaryLogs } = require("./utils/logs");
const languages = require("./utils/languages");
const locationList = require("./utils/locationList");
const clinicList = require("./utils/clinicList");
const calculateClinics = require("./utils/calculateClinics");
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
    generalLogs("New client connected", socket.id, undefined);
    const clientIP =
      socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    generalLogs(
      `Client connected from IP: ${clientIP}`,
      socket.id,
      undefined,
      clientIP
    );

    // ********* questionary events *********

    socket.on("questionary", async (phoneNumber, questionaryId) => {
      // const questionary = await questionaryInteractor.getUserQuestionaryById(questionaryId);
      // if (!questionary) return socket.emit("questionary not founded", questionaryId);
      questionaryLogs("Questionary started", socket.id, phoneNumber, clientIP);
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

      questionaries.push({
        userId: socket.id,
        phoneNumber: phoneNumber || "",
        questions: [],
        questionary: questionaryId,
        type: "questionary",
      });

      socket.emit("server socket id", socket.id);
    });

    socket.on("questionary response", (questionaryResponse) => {
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );

      if (questionaryResponse.type === "contact") {
        questionaryLogs(
          "Questionary started",
          socket.id,
          questionaryResponse.phoneNumber,
          ""
        );
        if (questionaryIndex !== -1) {
          questionaries[questionaryIndex].name = questionaryResponse.name;
          questionaries[questionaryIndex].phoneNumber =
            questionaryResponse.phone;
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
        socket.id,
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
          questionaries[questionaryIndex].questions[questionaryQuestionIndex] =
            questionaryResponse;
        } else {
          questionaries[questionaryIndex].questions.push(questionaryResponse);
        }
      }
    });

    socket.on("questionary finished", async (language) => {
      questionaryLogs("Questionary finished", socket.id, undefined, clientIP);
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        questionaryLogs(
          `Questionary finished and saving:`,
          socket.id,
          questionaries[questionaryIndex]?.phoneNumber,
          clientIP,
          questionaries[questionaryIndex]
        );
        questionaries[questionaryIndex].languageLocale = language || "es";
        userIps.push({
          ip: clientIP,
          expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });
        console.log("CREATING USER QUESTIONARY");
        const questionaryCreated =
          await userQuestionaryInteractor.createUserQuestionary(
            questionaries[questionaryIndex]
          );
        if (!questionaryCreated) {
          questionaryLogs(
            `Questionary not saved: ${questionaries[questionaryIndex]}`,
            socket.id,
            phoneNumber,
            clientIP
          );
          return socket.emit("questionary not saved", socket.id);
        }
        questionaries.splice(questionaryIndex, 1);
        socket.emit(
          "questionary saved",
          questionaryCreated.questionary.bot.name
        );
      }
    });

    // ********* static questionary events *********

    socket.on("static questionary", async (phoneNumber, questionaryId) => {
      // const questionary = await questionaryInteractor.getUserQuestionaryById(questionaryId);
      // if (!questionary) return socket.emit("questionary not founded", questionaryId);
      questionaryLogs("Questionary started", socket.id, phoneNumber);
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

      questionaries.push({
        userId: socket.id,
        phoneNumber: phoneNumber || "",
        questions: [],
        questionary: questionaryId,
        type: "static questionary",
      });

      socket.emit("static questionary server socket id", socket.id);
    });

    socket.on("static questionary response", (questionaryResponse) => {
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );

      if (questionaryResponse.type === "contact") {
        questionaryLogs(
          "Questionary started",
          socket.id,
          questionaryResponse.phoneNumber,
          ""
        );
        if (questionaryIndex !== -1) {
          questionaries[questionaryIndex].name = questionaryResponse.name;
          questionaries[questionaryIndex].phoneNumber =
            questionaryResponse.phone;
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
        socket.id,
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
          questionaries[questionaryIndex].questions[questionaryQuestionIndex] =
            questionaryResponse;
        } else {
          questionaries[questionaryIndex].questions.push(questionaryResponse);
        }
      }
    });

    socket.on("static questionary finished", async (language) => {
      questionaryLogs("Questionary finished", socket.id, undefined);
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        questionaryLogs(
          `Questionary finished and saving:`,
          socket.id,
          questionaries[questionaryIndex]?.phoneNumber,
          "",
          questionaries[questionaryIndex]
        );
        questionaries[questionaryIndex].languageLocale = language || "es";
        const questionaryCreated =
          await userQuestionaryInteractor.createUserQuestionary(
            questionaries[questionaryIndex]
          );
        if (!questionaryCreated) {
          questionaryLogs(
            `Questionary not saved: ${questionaries[questionaryIndex]}`,
            socket.id,
            phoneNumber,
            ""
          );
          return socket.emit("static questionary not saved", socket.id);
        }
        chatInteractor.createChat(
          {
            chatId: socket.id,
            firstName:
              questionaries[questionaryIndex]?.phoneNumber || "Anonymous",
            model: "Static questionary",
            botName: "Static questionary",
          },
          socket.id
        );
        questionaries.splice(questionaryIndex, 1);
        socket.emit("static questionary saved", socket.id);
      }
    });

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
        const chatBot = bots.find((b) => b.name === botName);
        if (!chatBot) {
          socket.emit("bot not found", { botName: botName });
          return;
        }

        const userIpIndex = userIps.findIndex(
          (userIp) => userIp.ip === clientIP
        );
        // if (userIpIndex !== -1) userIps[userIpIndex].promptGenerated = true;

        const userQuestionary =
          await userQuestionaryInteractor.getUserQuestionary(formId);
        if (!userQuestionary || chatBot.type !== "webform") throw new Error();

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
                    pais: location.name,
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
            console.log("CalculatedClinics", calculatedClinics.response);
            clinicsLogs(
              `CalculatedClinics: ${calculatedClinics.response}`,
              socket.id,
              undefined,
              clientIP
            );
            conversations.push({
              userId: socket.id,
              botName,
              lastMessages: [JSON.stringify(calculatedClinics.response)],
            });
            socket.emit("message", {
              body: JSON.stringify(calculatedClinics.response),
            });
            chatInteractor.createChat(
              {
                chatId: socket.id,
                firstName: "User[web]",
                model: chatBot.model,
                botName: chatBot.name,
              },
              formId,
              undefined,
              undefined,
              JSON.stringify(calculatedClinics.response),
              calculatedClinics.logs
            );
            await messageInteractor.createMessage({
              chatId: socket.id,
              botName: chatBot.name,
              data: "Initializing chat...",
              role: "system",
              promptToken: 0,
              tokens: 0,
              totalTokens: 0,
            });

            await messageInteractor.createMessage({
              chatId: socket.id,
              botName: chatBot.name,
              data: JSON.stringify(calculatedClinics.response),
              role: "assistant",
              promptToken: 0,
              tokens: 0,
              totalTokens: 0,
            });
          } catch (err) {
            console.log(err);
            socket.emit("errorMessage", {
              body: "An error has occurred. Please try again later.",
            });

            chatInteractor.createChat(
              {
                chatId: socket.id,
                firstName: "User[web]",
                model: chatBot.model,
                botName: chatBot.name,
              },
              formId,
              "",
              ""
            );
            await messageInteractor.createMessage({
              chatId: socket.id,
              botName: chatBot.name,
              data: "An error has occurred. Please try again later.",
              role: "assistant",
              promptToken: 0,
              tokens: 0,
              totalTokens: 0,
            });
          }
        } else {
          socket.emit("errorMessage", {
            body: "An error has occurred. Please try again later.",
          });

          chatInteractor.createChat(
            {
              chatId: socket.id,
              firstName: "User[web]",
              model: chatBot.model,
              botName: chatBot.name,
            },
            formId,
            "",
            ""
          );
          await messageInteractor.createMessage({
            chatId: socket.id,
            botName: chatBot.name,
            data: "An error has occurred. Please try again later.",
            role: "assistant",
            promptToken: 0,
            tokens: 0,
            totalTokens: 0,
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
    socket.on("external link", async (href) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === socket.id
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      if (chatBot) {
        clinicsLogs(
          `External link clicked: ${href}`,
          socket.id,
          undefined,
          clientIP
        );
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: `El usuario hizo click al enlace que dirige a ${href}.`,
          role: "user",
        });
      }
    });

    socket.on("get evaluation", async (clinicName) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === socket.id
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      if (chatBot) {
        clinicsLogs(
          `The user requested an evaluation for the clinic:  ${clinicName}`,
          socket.id,
          undefined,
          clientIP
        );
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: `El usuario solicitó una valoración para la clínica ${clinicName}.`,
          role: "user",
        });
      }
    });

    socket.on("clinics viewed", async (clinicName) => {
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === socket.id
      );
      const chatBot = bots.find(
        (b) => b.name == conversations[conversationIndex]?.botName
      );
      if (chatBot) {
        clinicsLogs(
          `The user is on the clinics page.`,
          socket.id,
          undefined,
          clientIP
        );
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: `El usuario está en la página de clinicas.`,
          role: "user",
        });
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
      generalLogs("Client disconnected", socket.id, undefined, clientIP);

      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        userQuestionaryInteractor.createUserQuestionaryAndChat(
          questionaries[questionaryIndex],
          questionaries[questionaryIndex].type || "static questionary"
        );

        // userIps.push({
        //   ip: clientIP,
        //   expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
        // });

        questionaries.splice(questionaryIndex, 1);
      }

      const conversationIndex = conversations.findIndex(
        (user) => user.userId === socket.id
      );

      if (conversationIndex !== -1) {
        const chatBot = bots.find(
          (b) => b.name == conversations[conversationIndex]?.botName
        );

        messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: `El usuario se ha desconectado.`,
          role: "user",
        });

        return conversations.splice(conversationIndex, 1);
      }
    });
  });
};

module.exports = { initializeIO, setBots, addBot, updateBot, removeBot };
