import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { styles } from "../styles/common";
import { t } from "../constants/strings";
import { MOOD_QUESTIONS_KO, MOOD_QUESTIONS_EN } from "../constants/moods";

export default function MoodScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { language = "ko-KR", watchRegion = "KR" } = route.params || {};

  const QUESTIONS = useMemo(
    () => (language.startsWith("en") ? MOOD_QUESTIONS_EN : MOOD_QUESTIONS_KO),
    [language]
  );

  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");

  const totalQuestions = QUESTIONS.length;
  const question = QUESTIONS[currentIndex];
  const selectedOptionId = answers[question.id];

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setError("");
  };

  const calculateMood = () => {
    const scores = {
      행복해요: 0,
      우울해요: 0,
      설레요: 0,
      신나요: 0,
      아무거나: 0,
    };

    QUESTIONS.forEach((q) => {
      const selectedId = answers[q.id];
      const option = q.options.find((opt) => opt.id === selectedId);
      if (!option?.weights) return;
      Object.entries(option.weights).forEach(([moodKey, weight]) => {
        if (scores[moodKey] != null) scores[moodKey] += weight;
      });
    });

    let bestMood = "아무거나";
    let bestScore = -Infinity;
    Object.entries(scores).forEach(([moodKey, score]) => {
      if (
        score > bestScore ||
        (score === bestScore &&
          bestMood === "아무거나" &&
          moodKey !== "아무거나")
      ) {
        bestMood = moodKey;
        bestScore = score;
      }
    });

    if (bestScore <= 0) bestMood = "아무거나";
    return bestMood;
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      setError(
        language.startsWith("en")
          ? "Please select an answer."
          : "현재 질문에 대한 답을 선택해 주세요."
      );
      return;
    }

    if (currentIndex === totalQuestions - 1) {
      const mood = calculateMood();
      navigation.navigate("Results", { mood, language, watchRegion });
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setError("");
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setError("");
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.moodScreenContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.moodTopRow}>
          <Text style={styles.moodTopLabel}>{t(language, "moodTopLabel")}</Text>
          <Text style={styles.moodTopStep}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
        </View>

        <View style={styles.moodQuestionBlock}>
          <Text style={styles.moodQuestionText}>{question.text}</Text>
        </View>

        <View style={styles.moodOptionsBlock}>
          {question.options.map((opt) => {
            const isSelected = opt.id === selectedOptionId;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.moodOptionButton,
                  isSelected && styles.moodOptionButtonSelected,
                ]}
                onPress={() => handleSelectOption(question.id, opt.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.moodOptionText,
                    isSelected && styles.moodOptionTextSelected,
                  ]}
                >
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.moodErrorText}>{error}</Text> : null}

        <View
          style={[
            styles.moodBottomRow,
            { marginBottom: insets.bottom > 0 ? insets.bottom : 8 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.moodPrevButton,
              currentIndex === 0 && { opacity: 0.3 },
            ]}
            disabled={currentIndex === 0}
            onPress={handlePrev}
          >
            <Text style={styles.moodPrevText}>{t(language, "prev")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moodNextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.moodNextText}>
              {currentIndex === totalQuestions - 1
                ? t(language, "viewResult")
                : t(language, "next")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
