import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Complete user journey: sign in, create task, mark complete, logout', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // 1. Verify on login screen and sign in
    expect(find.byKey(const Key('login-screen-title')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('email-field')), 'tester@example.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'local-test-password');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    // 2. Add a new task
    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('task-title-field')), 'Check release flow');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    expect(find.text('Check release flow'), findsOneWidget);

    // 3. Practice exercise: Mark the task complete
    final completeBtn = find.byKey(const Key('complete-task-Check release flow'));
    expect(completeBtn, findsOneWidget);
    await tester.tap(completeBtn);
    await tester.pumpAndSettle();

    // 4. Practice exercise: Log out and verify that login screen appears
    await tester.tap(find.byKey(const Key('logout-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-screen-title')), findsOneWidget);
    expect(find.byKey(const Key('email-field')), findsOneWidget);
  });
}
