"""Freeze published history at the database level.

The model's save()/delete() already refuse to rewrite a revision, but a raw
UPDATE, a queryset .update(), or a stray psql session would sail straight past
Python. This trigger makes the guarantee structural: only `is_current` may
ever change on an existing revision, and no revision can be deleted.
"""

from django.db import migrations

FORWARD = """
CREATE OR REPLACE FUNCTION wjeen_content_version_is_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'content_contentversion is append-only: revision % cannot be deleted',
            OLD.number;
    END IF;

    IF NEW.number           IS DISTINCT FROM OLD.number
    OR NEW.snapshot         IS DISTINCT FROM OLD.snapshot
    OR NEW.source           IS DISTINCT FROM OLD.source
    OR NEW.label            IS DISTINCT FROM OLD.label
    OR NEW.created_at       IS DISTINCT FROM OLD.created_at
    OR NEW.rolled_back_from_id IS DISTINCT FROM OLD.rolled_back_from_id
    THEN
        RAISE EXCEPTION
            'content_contentversion is immutable: only is_current may change on revision %',
            OLD.number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wjeen_content_version_immutable ON content_contentversion;
CREATE TRIGGER wjeen_content_version_immutable
    BEFORE UPDATE OR DELETE ON content_contentversion
    FOR EACH ROW EXECUTE FUNCTION wjeen_content_version_is_immutable();
"""

REVERSE = """
DROP TRIGGER IF EXISTS wjeen_content_version_immutable ON content_contentversion;
DROP FUNCTION IF EXISTS wjeen_content_version_is_immutable();
"""


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]

    operations = [migrations.RunSQL(sql=FORWARD, reverse_sql=REVERSE)]
