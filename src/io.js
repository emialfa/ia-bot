const conversations = [];
const questionaries = [];

const openaiService = require("./services/openai.service");
const openai = require("./config/openai.config");
const chatInteractor = require("./interactors/chat.interactor");
const messageInteractor = require("./interactors/message.interactor");
const userQuestionaryInteractor = require("./interactors/userQuestionary.interactor");
const { generalLogs, questionaryLogs } = require("./utils/logs");

const initializeIO = async (io) => {
  io.on("connection", async (socket) => {
    generalLogs("New client connected", socket.id, undefined);

    // ********* questionary events *********

    socket.on("questionary", async (phoneNumber, questionaryId) => {
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
      });

      socket.emit("server socket id", socket.id);
    });

    socket.on("questionary response", (questionaryResponse) => {
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );

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
        ''
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
      questionaryLogs("Questionary finished", socket.id, undefined);
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        questionaryLogs(
          `Questionary finished and saving:`,
          socket.id,
          questionaries[questionaryIndex]?.phoneNumber,
          '',
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
            '',);
          return socket.emit("questionary not saved", socket.id);
        }
        chatInteractor.createChat(
          {
            chatId: socket.id,
            firstName:  questionaries[questionaryIndex]?.phoneNumber || "Anonymous",
            model: "Static questionary",
            botName: "Static questionary",
          },
          socket.id,
        );
        questionaries.splice(questionaryIndex, 1);
        socket.emit(
          "questionary saved",
          socket.id
        );
      }
    });

    socket.on("disconnect", () => {
      generalLogs("Client disconnected", socket.id, undefined);

      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        userQuestionaryInteractor.createUserQuestionaryAndChat(
          questionaries[questionaryIndex]
        );

        questionaries.splice(questionaryIndex, 1);
      }
    });
  });
};

module.exports = { initializeIO };
