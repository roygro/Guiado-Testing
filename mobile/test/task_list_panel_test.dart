import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task_list_panel.dart';

void main() {
  group('TaskListPanel Widget Tests', () {
    testWidgets('shows loading state', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: true, tasks: []),
          ),
        ),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows empty state', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: false, tasks: []),
          ),
        ),
      );
      expect(find.text('No tasks yet.'), findsOneWidget);
    });

    testWidgets('shows error state', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(
              loading: false,
              tasks: [],
              errorMessage: 'Could not load tasks.',
            ),
          ),
        ),
      );
      expect(find.text('Could not load tasks.'), findsOneWidget);
    });

    testWidgets('shows task data', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: false, tasks: ['Plan tests']),
          ),
        ),
      );
      expect(find.text('Plan tests'), findsOneWidget);
    });

    // Practice exercise: Add a retry button to the error state and test that tapping it invokes a callback exactly once
    testWidgets('tapping retry button invokes callback exactly once', (tester) async {
      int retryCalls = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListPanel(
              loading: false,
              tasks: const [],
              errorMessage: 'Network error occurred.',
              onRetry: () {
                retryCalls++;
              },
            ),
          ),
        ),
      );

      // Verify button is present
      final retryButton = find.byKey(const Key('retry-button'));
      expect(retryButton, findsOneWidget);
      expect(retryCalls, 0);

      // Tap the retry button
      await tester.tap(retryButton);
      await tester.pump();

      // Verify callback was invoked exactly once
      expect(retryCalls, 1);
    });
  });
}
