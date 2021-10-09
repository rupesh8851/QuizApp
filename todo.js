import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { Quiz as ExternalQuiz } from 'quiz-component/Quiz/Quiz';
import { useStoreState, useStoreActions } from 'easy-peasy';
import cookies from 'js-cookie';
import * as Sentry from '@sentry/browser';
import * as sentryUtil from 'utils/sentry';

import { Loader } from 'components/shared';
import { LandingPage as QuizLandingPage } from 'quiz-component/LandingPage/LandingPage';
import { ResultPage as QuizResultPage } from 'quiz-component/ResultPage/ResultPage';

import { insertTutorPrepQuizTracking } from 'graphql/queries/tutorTracking';
import { get, isEmpty, countBy } from 'lodash-es';
import { isLoggedIn } from 'utils/tokenUtils';
import quizSettings from 'utils/tutorPrepQuizSettings';
import { routes } from 'constants/index';

const Quiz = (props) => {
  const isUserLoggedIn = isLoggedIn();
  const { match } = props;
  const quizSlug = match.params.slug_id;
  const { fetchQuizBySlug, updateState: updateQuizState } = useStoreActions(actions => actions.quiz);
  const quiz = useStoreState(state => state.quiz);
  const quizDetails = get(quiz, `${quizSlug}.quizDetails`);
  const activeQuestionSlug = get(quiz, `${quizSlug}.activeQuestionSlug`);
  const { fetchQuestionsBySlugs, createQuestionIssueTicket } = useStoreActions(actions => actions.question);
  const questionDetails = useStoreState(state => get(state, `question.${activeQuestionSlug}.questionDetails`));
  const isQuestionSubmitted = useStoreState(state => get(state, `question.${activeQuestionSlug}.isQuestionSubmitted`));
  const quizStep = get(quiz, `${quizSlug}.quizStep`);
  const savedQuizResult = get(quiz, `${quizSlug}.savedQuizResult`, {});
  const passingMarks = get(quizDetails, 'passingPercentage') || 80;

  const getQuestSlugWROActiveQuestion = (distance) => {
    const questionSlugs = get(quizDetails, 'questions', []);
    const index = questionSlugs.indexOf(activeQuestionSlug) + distance;
    return get(questionSlugs, index, null);
  };

  useEffect(() => {
    isUserLoggedIn && fetchQuizBySlug(quizSlug);
    const storageUserSubmissions = JSON.parse(get(localStorage, 'userSubmissions', '{}'));
    if (isEmpty(storageUserSubmissions)) {
      const defaultUserSubmissions = {
        quizzes: {
          [quizSlug]: {}
        },
      };
      localStorage.setItem('userSubmissions', JSON.stringify(defaultUserSubmissions));
    }
  }, [quizSlug]);

  useEffect(() => {
    if (activeQuestionSlug) {
      fetchQuestionsBySlugs([
        activeQuestionSlug,
        getQuestSlugWROActiveQuestion(1),
      ]);
    }
  }, [get(quiz, quizSlug)]);

  function handleNextSubQuestion() {
    const nextQuestionSlug = getQuestSlugWROActiveQuestion(1);
    if (nextQuestionSlug !== null) {
      fetchQuestionsBySlugs([
        getQuestSlugWROActiveQuestion(2),
        getQuestSlugWROActiveQuestion(3),
      ]);
      updateQuizState({
        [quizSlug]: {
          ...get(quiz, quizSlug),
          activeQuestionSlug: nextQuestionSlug,
        },
      });
    }
  }

  function handlePrevSubQuestion() {
    const prevQuestionSlug = getQuestSlugWROActiveQuestion(-1);
    fetchQuestionsBySlugs([
      getQuestSlugWROActiveQuestion(-2),
      getQuestSlugWROActiveQuestion(-3),
    ]);
    if (prevQuestionSlug !== null) {
      updateQuizState({
        [quizSlug]: {
          ...get(quiz, quizSlug),
          activeQuestionSlug: prevQuestionSlug,
        },
      });
    }
  }

  function handleSubmitSubQuestion(data) {
    const storageUserSubmissions = JSON.parse(get(localStorage, 'userSubmissions', '{}'));
    const updatedUserSubmissions = {
      ...storageUserSubmissions,
      quizzes: {
        ...storageUserSubmissions.quizzes,
        [quizDetails.slug]: data.updatedUserAnswers
      }
    };
    localStorage.setItem('userSubmissions', JSON.stringify(updatedUserSubmissions));
  }

  const getResult = () => {
    const nonMarkQuestionFormats = ['tbe', 'url'];
    const storageUserSubmissions = JSON.parse(get(localStorage, 'userSubmissions', '{}'));
    const selectedAnswers = get(storageUserSubmissions, 'quizzes', {})[quizDetails.slug] || {};
    const selectedAnswersArr = Object.values(selectedAnswers).filter(ans => !nonMarkQuestionFormats.includes(ans.formatId));
    const totalQuestionsCount = selectedAnswersArr.length;
    let { true: correctQuestionsCount } = countBy(selectedAnswersArr, 'isCorrect');
    if (!correctQuestionsCount) {
      correctQuestionsCount = 0;
    }
    let score = Math.floor((correctQuestionsCount / totalQuestionsCount) * 100);
    if (score > 100) {
      score = 100;
    }
    if (score > 0 && score < 1) {
      score = 0;
    }
    return {
      score,
      isPassed: score >= passingMarks,
    };
  };

  const handleRedirectToResultPage = (quizResult) => {
    if (isEmpty(quizResult)) {
      Sentry.withScope((scope) => {
        scope.setTag('errorType', 'QuizComponentError');
        scope.setLevel('error');
        Sentry.captureException(new Error('Quiz Result empty in handleRedirectToResultPage'), {
          fingerprint: 'QuizComponentError'
        });
      });
      return;
    }
    const result = {
      ...getResult(),
      time_spent_in_ms: quizResult.time_spent_in_ms,
      is_completed: quizResult.is_completed,
    };
    updateQuizState({
      [quizSlug]: {
        ...get(quiz, quizSlug),
        quizStep: 'result',
        savedQuizResult: result,
      },
    });
  };

  const handleQuizSubmit = (quizResult) => {
    if (!isEmpty(quizResult)) {
      const storageUserSubmissions = JSON.parse(get(localStorage, 'userSubmissions', '{}'));
      const selectedAnswers = get(storageUserSubmissions, 'quizzes', {})[quizDetails.slug] || {};
      const result = {
        ...getResult(),
        time_spent_in_ms: quizResult.time_spent_in_ms,
        is_completed: quizResult.is_completed,
      };
      updateQuizState({
        [quizSlug]: {
          ...get(quiz, quizSlug),
          quizStep: 'result',
          savedQuizResult: result,
        },
      });
      const questionWiseIsCorrect = [];
      const questionWiseData = Object.keys(selectedAnswers).map((questionSlug) => {
        questionWiseIsCorrect.push(selectedAnswers[questionSlug].isCorrect);
        return {
          slug: questionSlug,
          is_correct: selectedAnswers[questionSlug].isCorrect,
          submitted_answer: selectedAnswers[questionSlug].selectedOptions,
          time_spent_in_ms: selectedAnswers[questionSlug].timeSpentInMs,
        };
      });
      sentryUtil.sendLogs('Tutor Prep Quiz submitted', {
        quizSlug,
        score: get(result, 'score', 0),
        timeSpentInMs: get(quizResult, 'time_spent_in_ms', 0),
        questionsIsCorrect: questionWiseIsCorrect
      });
      insertTutorPrepQuizTracking({
        quiz_slug: quizSlug,
        score: get(result, 'score', 0),
        time_spent_in_ms: get(quizResult, 'time_spent_in_ms', 0),
        is_completed: true,
        questions: questionWiseData,
      });
    } else {
      Sentry.withScope((scope) => {
        scope.setTag('errorType', 'QuizComponentError');
        scope.setLevel('error');
        Sentry.captureException(new Error('Quiz Result empty in handleQuizSubmit'), {
          fingerprint: 'QuizComponentError'
        });
      });
    }
  };

  const handleStartQuiz = () => {
    const currentTime = new Date().getTime();
    cookies.set('quizStartTime', currentTime);
    updateQuizState({
      [quizSlug]: {
        ...get(quiz, quizSlug),
        quizStep: 'question',
      },
    });
  };

  if (!quizDetails && quiz[quizSlug]) {
    return <Redirect to={routes.FOUR_NOT_FOUR} />;
  }

  if (!quizDetails || !questionDetails) {
    return <Loader text="quiz" />;
  }
  const resultPageProps = {
    quizTitle: get(quizDetails, 'name'),
    showRetakeButton: true,
    role: 'teacher',
    scoresInPercent: {
      correct: savedQuizResult.score,
      incorrect: 100 - savedQuizResult.score
    },
    passingScoreInPercent: passingMarks,
    enableGems: false,
    handleRetakeQuizClick: () => {
      const currentTime = new Date().getTime();
      cookies.set('quizStartTime', currentTime);
      const defaultUserSubmissions = {
        quizzes: {
          [quizSlug]: {}
        },
      };
      localStorage.setItem('userSubmissions', JSON.stringify(defaultUserSubmissions));
      updateQuizState({
        [quizSlug]: {
          ...get(quiz, quizSlug),
          quizStep: 'quiz',
          savedQuizResult: {},
          activeQuestionSlug: get(quizDetails, 'questions.0'),
        },
      });
    },
    handleViewAnswersClick: () => {
      const currentTime = new Date().getTime();
      cookies.set('quizStartTime', currentTime);
      const defaultUserSubmissions = {
        quizzes: {
          [quizSlug]: {}
        },
      };
      localStorage.setItem('userSubmissions', JSON.stringify(defaultUserSubmissions));
      updateQuizState({
        [quizSlug]: {
          ...get(quiz, quizSlug),
          quizStep: 'quiz',
          savedQuizResult: {},
          activeQuestionSlug: get(quizDetails, 'questions.0'),
        },
      });
    }
  };

  const landinPageProps = {
    quizTitle: get(quizDetails, 'name'),
    handleStartClick: handleStartQuiz,
    quizType: 'normal', // or revision // Todo - get this from setting / API
    enableGems: false,
    classes: {},
    showElements: {
      header: true,
      backButton: false,
    },
  };
  const userSubmissions = JSON.parse(get(localStorage, 'userSubmissions', '{}'));
  const storageUserAnswers = get(userSubmissions, 'quizzes', {})[quizDetails.slug];

  const quizProps = {
    ...quizSettings,
    quizStartTime: cookies.getJSON('quizStartTime'),
    submitButton: quizSettings.submitButton && !isQuestionSubmitted,
    quizSlug,
    quizDetails,
    storageUserAnswers,
    questionSlug: activeQuestionSlug,
    questionDetails,
    handleNextClick: handleNextSubQuestion,
    handleSkipClick: handleNextSubQuestion,
    handleBackClick: handlePrevSubQuestion,
    handleSubmitClick: handleQuizSubmit,
    handleRedirectToResultPage,
    handleIssueSubmitClick: createQuestionIssueTicket,
    handleCheckClick: handleSubmitSubQuestion,
  };

  if (quizStep === 'introduction') {
    return <QuizLandingPage {...landinPageProps} />;
  }
  if (quizStep === 'result') {
    return <QuizResultPage {...resultPageProps} />;
  }
  return <ExternalQuiz {...quizProps} />;
};

export default Quiz;
