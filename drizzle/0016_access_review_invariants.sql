-- Phase 3 hardening: encode access-review state-machine invariants in D1.
-- Governance records never grant authority; these triggers prevent audit state from
-- claiming a decision/remediation state that the workflow could not legitimately reach.

CREATE TRIGGER `corporate_access_review_item_insert_guard`
BEFORE INSERT ON `corporate_access_review_items`
BEGIN
  SELECT RAISE(ABORT, 'invalid access review item state')
  WHERE
    (`NEW`.`decision` = 'pending' AND (`NEW`.`remediation_status` != 'not_required' OR `NEW`.`reviewer` IS NOT NULL OR `NEW`.`reviewed_at` IS NOT NULL OR `NEW`.`remediated_at` IS NOT NULL))
    OR (`NEW`.`decision` = 'retain' AND (`NEW`.`remediation_status` != 'not_required' OR `NEW`.`reviewer` IS NULL OR `NEW`.`reviewed_at` IS NULL OR `NEW`.`remediated_at` IS NOT NULL))
    OR (`NEW`.`decision` = 'revoke' AND (`NEW`.`remediation_status` = 'not_required' OR `NEW`.`reviewer` IS NULL OR `NEW`.`reviewed_at` IS NULL))
    OR (`NEW`.`remediation_status` = 'completed' AND `NEW`.`remediated_at` IS NULL)
    OR (`NEW`.`remediation_status` != 'completed' AND `NEW`.`remediated_at` IS NOT NULL);
END;
--> statement-breakpoint

CREATE TRIGGER `corporate_access_review_item_update_guard`
BEFORE UPDATE ON `corporate_access_review_items`
BEGIN
  SELECT RAISE(ABORT, 'closed access review items are immutable')
  WHERE COALESCE((SELECT `status` FROM `corporate_access_reviews` WHERE `id` = `NEW`.`review_id`), '') != 'open';

  SELECT RAISE(ABORT, 'completed remediation decisions are immutable')
  WHERE `OLD`.`remediation_status` = 'completed'
    AND (`NEW`.`decision` != `OLD`.`decision` OR `NEW`.`remediation_status` != `OLD`.`remediation_status` OR COALESCE(`NEW`.`remediated_at`, '') != COALESCE(`OLD`.`remediated_at`, ''));

  SELECT RAISE(ABORT, 'invalid access review item state')
  WHERE
    (`NEW`.`decision` = 'pending' AND (`NEW`.`remediation_status` != 'not_required' OR `NEW`.`reviewer` IS NOT NULL OR `NEW`.`reviewed_at` IS NOT NULL OR `NEW`.`remediated_at` IS NOT NULL))
    OR (`NEW`.`decision` = 'retain' AND (`NEW`.`remediation_status` != 'not_required' OR `NEW`.`reviewer` IS NULL OR `NEW`.`reviewed_at` IS NULL OR `NEW`.`remediated_at` IS NOT NULL))
    OR (`NEW`.`decision` = 'revoke' AND (`NEW`.`remediation_status` = 'not_required' OR `NEW`.`reviewer` IS NULL OR `NEW`.`reviewed_at` IS NULL))
    OR (`NEW`.`remediation_status` = 'completed' AND `NEW`.`remediated_at` IS NULL)
    OR (`NEW`.`remediation_status` != 'completed' AND `NEW`.`remediated_at` IS NOT NULL);
END;
--> statement-breakpoint

CREATE TRIGGER `corporate_access_review_completion_guard`
BEFORE UPDATE OF `status` ON `corporate_access_reviews`
WHEN `NEW`.`status` = 'completed' AND `OLD`.`status` = 'open'
BEGIN
  SELECT RAISE(ABORT, 'access review still has unresolved authority')
  WHERE EXISTS (
    SELECT 1 FROM `corporate_access_review_items`
    WHERE `review_id` = `NEW`.`id`
      AND (`decision` = 'pending' OR (`decision` = 'revoke' AND `remediation_status` != 'completed'))
  );
END;
--> statement-breakpoint

CREATE TRIGGER `corporate_access_review_closed_state_guard`
BEFORE UPDATE OF `status` ON `corporate_access_reviews`
WHEN `OLD`.`status` != 'open' AND `NEW`.`status` != `OLD`.`status`
BEGIN
  SELECT RAISE(ABORT, 'closed access review status is immutable');
END;
