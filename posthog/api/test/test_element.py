from .base import BaseTest
from posthog.models import Event, Person, Element, Action, ActionStep


class TestElement(BaseTest):
    TESTS_API = True 

    def _signup_event(self, distinct_id: str):
        sign_up = Event.objects.create(distinct_id=distinct_id, team=self.team)
        Element.objects.create(tag_name='button', text='Sign up!', event=sign_up, order=0)
        return sign_up

    def _pay_event(self, distinct_id: str):
        sign_up = Event.objects.create(distinct_id=distinct_id, team=self.team)
        Element.objects.create(tag_name='button', text='Pay $10', event=sign_up, order=0)
        # check we're not duplicating
        Element.objects.create(tag_name='div', text='Sign up!', event=sign_up, order=1)
        return sign_up

    def _movie_event(self, distinct_id: str):
        sign_up = Event.objects.create(distinct_id=distinct_id, team=self.team)
        Element.objects.create(tag_name='a', attr_class=['watch_movie', 'play'], text='Watch now', attr_id='something', href='/movie', event=sign_up, order=0)
        Element.objects.create(tag_name='div', href='/movie', event=sign_up, order=1)

    def test_volume(self):
        self._signup_event('1')
        self._signup_event('2')
        self._signup_event('3')

        self._pay_event('2')

        response = self.client.post('/api/element/volume/', data={
            'id_1': [{'tag_name': 'button', 'text': 'Sign up!'}],
            'id_2': [
                {'tag_name': 'button', 'text': 'Pay $10'},
                {'tag_name': 'div', 'text': 'Sign up!'}
            ],
        }, content_type='application/json').json()

        self.assertEqual(response['id_1'], 3)
        self.assertEqual(response['id_2'], 1)